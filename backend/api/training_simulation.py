import asyncio
import json
import random
import re
import time
from typing import Any, AsyncGenerator, Dict, List, Literal, Optional

import numpy as np
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter()

LOWER_IS_BETTER = {"RMSE", "MAE", "MAPE", "SMAPE", "Log Loss"}

N_EPOCHS = 50
SECTION_SLEEP = 0.35
EPOCH_SLEEP = 0.14
SETUP_SLEEP = 1.05
EVAL_SLEEP = 0.85
BENCHMARK_SLEEP = 1.0
SYNTHETIC_SAMPLE_SIZE = 80
TRAIN_TEST_SPLIT = 0.2


def get_oss_architecture(model_id: str, task_type: str) -> List[Dict]:
    mid = (model_id or "").lower()

    if "distilbert" in mid:
        return [
            {"label": "Embed", "icon": "📥", "name": "Token Embeddings",
             "details": ["vocab: 30,522 tokens", "dim: 768", "max_len: 512", "LayerNorm + Dropout 0.1"]},
            {"label": "Encoder", "icon": "🔁", "name": "6× Transformer Block",
             "details": ["12 attn heads · head_dim 64", "FFN: 768 → 3,072 → 768", "GELU activation", "Dropout 0.1 + LayerNorm"]},
            {"label": "Pooler", "icon": "🔗", "name": "CLS Pooler",
             "details": ["Dense 768 → 768", "Tanh activation"]},
            {"label": "Head", "icon": "📤", "name": "Classifier Head",
             "details": ["Dropout 0.1", "Linear 768 → n_classes", "Softmax output"]},
        ]

    if "roberta" in mid:
        return [
            {"label": "Embed", "icon": "📥", "name": "Byte-pair Embeddings",
             "details": ["vocab: 50,265 tokens (BPE)", "dim: 768 · max_len: 514", "no segment embeddings", "learned pos embed"]},
            {"label": "Encoder", "icon": "🔁", "name": "12× Transformer Block",
             "details": ["12 attn heads · head_dim 64", "FFN: 768 → 3,072 → 768", "GELU · LayerNorm", "Dropout 0.1"]},
            {"label": "Pooler", "icon": "🔗", "name": "CLS Pooler",
             "details": ["Dense 768 → 768", "Tanh activation"]},
            {"label": "Head", "icon": "📤", "name": "Classifier Head",
             "details": ["Dropout 0.1", "Linear 768 → n_classes", "Softmax output"]},
        ]

    if "albert" in mid:
        return [
            {"label": "Embed", "icon": "📥", "name": "Factorized Embeddings",
             "details": ["vocab: 30,000 · embed_dim 128", "projected 128 → 768", "max_len: 512", "SentencePiece tokenizer"]},
            {"label": "Encoder", "icon": "🔁", "name": "12× Shared Transformer",
             "details": ["cross-layer weight sharing", "12 attn heads · head_dim 64", "FFN: 768 → 3,072 → 768", "GELU + LayerNorm"]},
            {"label": "Pooler", "icon": "🔗", "name": "CLS Pooler",
             "details": ["Dense 768 → 768", "Tanh activation"]},
            {"label": "Head", "icon": "📤", "name": "Classifier Head",
             "details": ["Dropout 0.1", "Linear 768 → n_classes", "Softmax output"]},
        ]

    if "xlm" in mid:
        return [
            {"label": "Embed", "icon": "📥", "name": "Multilingual Token Embed",
             "details": ["vocab: 250,002 · 100 languages", "dim: 768 · max_len: 512", "lang ID embedding", "BPE tokenizer"]},
            {"label": "Encoder", "icon": "🔁", "name": "12× Transformer Block",
             "details": ["12 attn heads · head_dim 64", "FFN: 768 → 3,072 → 768", "GELU · LayerNorm", "Dropout 0.1"]},
            {"label": "Pooler", "icon": "🔗", "name": "CLS Pooler",
             "details": ["Dense 768 → 768", "Tanh activation"]},
            {"label": "Head", "icon": "📤", "name": "Classifier Head",
             "details": ["Linear 768 → n_classes", "Softmax output"]},
        ]

    if "bert" in mid:
        return [
            {"label": "Embed", "icon": "📥", "name": "Token + Pos + Seg Embed",
             "details": ["vocab: 30,522 · dim 768", "max_len: 512 · pos embed", "segment embed (A / B)", "LayerNorm + Dropout 0.1"]},
            {"label": "Encoder", "icon": "🔁", "name": "12× Transformer Block",
             "details": ["12 attn heads · head_dim 64", "FFN: 768 → 3,072 → 768", "GELU activation", "LayerNorm + Dropout 0.1"]},
            {"label": "Pooler", "icon": "🔗", "name": "CLS Pooler",
             "details": ["Dense 768 → 768", "Tanh activation"]},
            {"label": "Head", "icon": "📤", "name": "Classifier Head",
             "details": ["Dropout 0.1", "Linear 768 → n_classes", "Softmax output"]},
        ]

    if "gpt2" in mid or "gpt-2" in mid:
        return [
            {"label": "Embed", "icon": "📥", "name": "Token + Position Embed",
             "details": ["vocab: 50,257 · dim 768", "max_len: 1,024", "learned pos embed", "no causal masking at embed"]},
            {"label": "Blocks", "icon": "🔁", "name": "12× Decoder Block",
             "details": ["12 causal attn heads · head_dim 64", "FFN: 768 → 3,072 → 768", "GELU · causal mask", "LayerNorm pre-block"]},
            {"label": "Head", "icon": "📤", "name": "LM / Classification Head",
             "details": ["last token pooling", "Linear 768 → n_classes"]},
        ]

    if "t5" in mid:
        return [
            {"label": "Embed", "icon": "📥", "name": "Shared Token Embed",
             "details": ["vocab: 32,128 · dim 512", "relative position bias", "SentencePiece tokenizer"]},
            {"label": "Enc", "icon": "🔁", "name": "6× Encoder Block",
             "details": ["8 attn heads · head_dim 64", "FFN: 512 → 2,048 → 512", "ReLU · relative pos bias"]},
            {"label": "Dec", "icon": "🔁", "name": "6× Decoder Block",
             "details": ["8 self-attn + cross-attn heads", "FFN: 512 → 2,048 → 512", "causal self-attn"]},
            {"label": "Head", "icon": "📤", "name": "Classification Head",
             "details": ["encoder CLS repr", "Linear 512 → n_classes"]},
        ]

    if "resnet" in mid:
        depth = "50"
        for d in ["18", "34", "50", "101", "152"]:
            if d in mid:
                depth = d
                break
        blocks = {"18": "2-2-2-2", "34": "3-4-6-3", "50": "3-4-6-3", "101": "3-4-23-3", "152": "3-8-36-3"}.get(depth, "3-4-6-3")
        ch = "64/128/256/512" if depth in ["18", "34"] else "256/512/1,024/2,048"
        return [
            {"label": "Stem", "icon": "📥", "name": "Conv Stem",
             "details": ["7×7 conv · 64 ch · stride 2", "BN + ReLU", "3×3 MaxPool stride 2"]},
            {"label": "Stage 1", "icon": "🧱", "name": f"ResNet Stage 1  ({blocks.split('-')[0]} blocks)",
             "details": [f"64 ch · {'basic' if depth in ['18','34'] else 'bottleneck'} block", "1×1 + 3×3 + 1×1 conv", "identity shortcut"]},
            {"label": "Stage 2–4", "icon": "🧱", "name": f"ResNet Stages 2–4  ({'-'.join(blocks.split('-')[1:])} blocks)",
             "details": [f"ch: {ch}", "stride-2 downsampling", "residual + projection shortcuts"]},
            {"label": "Head", "icon": "📤", "name": "Classifier Head",
             "details": ["Global Avg Pool", f"Linear → n_classes", "Softmax"]},
        ]

    if "efficientnet" in mid:
        v = "0"
        for i in ["b7", "b6", "b5", "b4", "b3", "b2", "b1", "b0"]:
            if i in mid:
                v = i[1]
                break
        res = {"0": "224", "1": "240", "2": "260", "3": "300", "4": "380", "5": "456", "6": "528", "7": "600"}.get(v, "224")
        feat = {"0": "1,280", "1": "1,280", "2": "1,408", "3": "1,536", "4": "1,792", "5": "2,048", "6": "2,304", "7": "2,560"}.get(v, "1,280")
        return [
            {"label": "Stem", "icon": "📥", "name": "Stem Conv",
             "details": [f"3×3 conv · 32 ch · stride 2", "SiLU activation · BN", f"input: {res}×{res}×3"]},
            {"label": "MBConv 1–3", "icon": "🔁", "name": "MBConv Stages 1–3",
             "details": ["expand ratio 1 → 6", "depth-wise 3×3 / 5×5", "SE ratio 0.25 · SiLU", "stochastic depth drop"]},
            {"label": "MBConv 4–7", "icon": "🔁", "name": "MBConv Stages 4–7",
             "details": [f"up to {feat} ch", "stride-2 at each stage", "SE attention gates", f"B{v} width/depth scaling"]},
            {"label": "Head", "icon": "📤", "name": "Classifier Head",
             "details": [f"Global Avg Pool → {feat}", f"Dropout 0.{v}2", "Linear → n_classes · Softmax"]},
        ]

    if "mobilenet" in mid:
        v2 = "v2" in mid or "mobilenet_v2" in mid
        return [
            {"label": "Stem", "icon": "📥", "name": "Conv Stem",
             "details": ["3×3 conv · 32 ch · stride 2", "BN + ReLU6"]},
            {"label": "Blocks", "icon": "🔁", "name": f"{'Inverted Residual' if v2 else 'Depth-wise Sep'} Blocks",
             "details": [f"{'expand + DWConv + project' if v2 else '3×3 DWConv + 1×1 PWConv'}", "BN + ReLU6", f"{'residual if stride=1 + same dim' if v2 else 'stride-2 at 5 blocks'}", "13 total blocks"]},
            {"label": "Pool", "icon": "🔗", "name": "Global Avg Pool",
             "details": [f"1,280-dim repr · Dropout"]},
            {"label": "Head", "icon": "📤", "name": "Classifier Head",
             "details": ["Linear 1,280 → n_classes", "Softmax"]},
        ]

    if "vit" in mid or "vision-transformer" in mid:
        size = "base"
        if "large" in mid: size = "large"
        if "huge" in mid: size = "huge"
        if "small" in mid: size = "small"
        if "tiny" in mid: size = "tiny"
        cfg = {"tiny": ("192", "3", "12"), "small": ("384", "6", "12"),
               "base": ("768", "12", "12"), "large": ("1024", "16", "24"), "huge": ("1280", "16", "32")}.get(size, ("768", "12", "12"))
        patch = "14×14" if size == "huge" else "16×16"
        return [
            {"label": "Patch", "icon": "📥", "name": "Patch Embedding",
             "details": [f"{patch} patches → tokens", f"dim: {cfg[0]}", "learnable pos embed", "CLS token prepended"]},
            {"label": "Enc", "icon": "🔁", "name": f"{cfg[2]}× Transformer Block",
             "details": [f"{cfg[1]} attn heads · head_dim {int(cfg[0])//int(cfg[1])}", f"MLP: {cfg[0]} → {int(cfg[0])*4} → {cfg[0]}", "GELU · LayerNorm (pre-norm)", "Dropout + stochastic depth"]},
            {"label": "Pool", "icon": "🔗", "name": "CLS Token Pooler",
             "details": [f"LayerNorm → dim {cfg[0]}", "CLS position output"]},
            {"label": "Head", "icon": "📤", "name": "Classifier Head",
             "details": [f"Linear {cfg[0]} → n_classes", "Softmax"]},
        ]

    if "swin" in mid:
        return [
            {"label": "Patch", "icon": "📥", "name": "Patch Partition",
             "details": ["4×4 non-overlapping patches", "dim: 96 · linear projection", "no pos embed (relative bias)"]},
            {"label": "Stage 1–2", "icon": "🔁", "name": "Swin Stages 1–2",
             "details": ["window size: 7×7", "W-MSA + SW-MSA alternating", "patch merging 2× · dim 96→192", "MLP ratio 4 · GELU"]},
            {"label": "Stage 3–4", "icon": "🔁", "name": "Swin Stages 3–4",
             "details": ["patch merging 2× · dim 384→768", "shifted window attn", "stochastic depth drop", "LayerNorm (pre-norm)"]},
            {"label": "Head", "icon": "📤", "name": "Classifier Head",
             "details": ["Global Avg Pool", "LayerNorm → 768", "Linear → n_classes · Softmax"]},
        ]

    if "convnext" in mid:
        return [
            {"label": "Stem", "icon": "📥", "name": "Patch Stem",
             "details": ["4×4 conv · stride 4", "96 ch · LayerNorm"]},
            {"label": "Stage 1–2", "icon": "🧱", "name": "ConvNeXt Stages 1–2",
             "details": ["3 + 3 blocks", "7×7 depth-wise conv", "inv bottleneck · GELU", "layer scale γ = 1e-6"]},
            {"label": "Stage 3–4", "icon": "🧱", "name": "ConvNeXt Stages 3–4",
             "details": ["9 + 3 blocks", "dim: 384 → 768", "stochastic depth", "downsampling 2× between stages"]},
            {"label": "Head", "icon": "📤", "name": "Classifier Head",
             "details": ["Global Avg Pool", "LayerNorm → 768", "Linear → n_classes"]},
        ]

    if "deit" in mid:
        return [
            {"label": "Patch", "icon": "📥", "name": "Patch Embedding",
             "details": ["16×16 patches · dim 768", "CLS token + distill token", "learnable pos embed"]},
            {"label": "Enc", "icon": "🔁", "name": "12× Transformer Block",
             "details": ["12 attn heads · head_dim 64", "FFN: 768 → 3,072 · GELU", "LayerNorm (pre-norm)", "hard distillation from CNN teacher"]},
            {"label": "Head", "icon": "📤", "name": "Dual Classification Head",
             "details": ["CLS → n_classes (Softmax)", "distill → n_classes (Softmax)", "averaged at inference"]},
        ]

    if "clip" in mid:
        return [
            {"label": "Img Enc", "icon": "📥", "name": "Vision Encoder (ViT-B/32)",
             "details": ["32×32 patches · dim 768", "12 layers · 12 heads", "positional embed + CLS"]},
            {"label": "Txt Enc", "icon": "🔁", "name": "Text Encoder (Transformer)",
             "details": ["vocab 49,408 (BPE) · dim 512", "12 layers · 8 heads", "causal self-attention"]},
            {"label": "Proj", "icon": "🔗", "name": "Embedding Projection",
             "details": ["image: 768 → 512", "text: 512 → 512", "L2 normalised"]},
            {"label": "Head", "icon": "📤", "name": "Zero-shot / Task Head",
             "details": ["cosine similarity scoring", "Linear → n_classes (fine-tune)"]},
        ]

    if "xgboost" in mid or "xgb" in mid:
        return [
            {"label": "Input", "icon": "📥", "name": "Feature Input",
             "details": ["n features · no scaling", "auto missing value handling"]},
            {"label": "Trees", "icon": "🌲", "name": "Gradient Boosted Trees",
             "details": ["100 estimators · max_depth 6", "learning rate 0.10", "L1 + L2 regularisation"]},
            {"label": "Reg", "icon": "⚙️", "name": "Regularisation",
             "details": ["subsample 0.80", "colsample_bytree 0.80", "min_child_weight 1"]},
            {"label": "Output", "icon": "📤", "name": "Sigmoid / Softmax Output",
             "details": ["binary:logistic or softmax", "threshold 0.50"]},
        ]

    if "lightgbm" in mid or "lgbm" in mid:
        return [
            {"label": "Input", "icon": "📥", "name": "Feature Input",
             "details": ["n features · auto binning", "categorical support"]},
            {"label": "Boost", "icon": "⚡", "name": "Leaf-wise Boosting",
             "details": ["200 leaves · 200 estimators", "learning rate 0.05", "GOSS sampling"]},
            {"label": "Reg", "icon": "⚙️", "name": "Regularisation",
             "details": ["L1 + L2 · min_data_leaf 20", "feature fraction 0.80"]},
            {"label": "Output", "icon": "📤", "name": "Softmax Output",
             "details": ["n classes · cross-entropy"]},
        ]

    return [
        {"label": "Input", "icon": "📥", "name": "Model Input",
         "details": ["task-specific preprocessing", "feature/token encoding"]},
        {"label": "Backbone", "icon": "🔁", "name": "Pre-trained Backbone",
         "details": [model_id.split("/")[-1] if model_id else "HuggingFace model", "task-specific fine-tuning"]},
        {"label": "Head", "icon": "📤", "name": "Task Head",
         "details": ["Linear → n_classes", "Softmax / Sigmoid"]},
    ]


CUSTOM_ARCHITECTURE_POOLS: Dict[str, List[Dict]] = {
    "text_classification": [
        {
            "name": "TF-IDF + MLP",
            "layers": [
                {"label": "Input", "icon": "📥", "name": "TF-IDF Vectorizer",
                 "details": ["vocab: 5,000 · n-gram (1,2)", "sublinear_tf=True · L2 norm", "min_df=2"]},
                {"label": "Dense 1", "icon": "🧱", "name": "Dense 256 + ReLU",
                 "details": ["Linear 5,000 → 256", "ReLU · BatchNorm", "Dropout 0.30"]},
                {"label": "Dense 2", "icon": "🧱", "name": "Dense 128 + ReLU",
                 "details": ["Linear 256 → 128", "ReLU · Dropout 0.20"]},
                {"label": "Output", "icon": "📤", "name": "Softmax Head",
                 "details": ["Linear 128 → n_classes", "Softmax · cross-entropy loss"]},
            ],
        },
        {
            "name": "Bag-of-Words + Logistic Regression",
            "layers": [
                {"label": "Input", "icon": "📥", "name": "CountVectorizer",
                 "details": ["vocab: 10,000 · binary counts", "n-gram (1,3) · min_df=1"]},
                {"label": "Feat", "icon": "⚙️", "name": "L2 Feature Scaling",
                 "details": ["TF-IDF transform on counts", "L2 row normalisation"]},
                {"label": "Model", "icon": "🧱", "name": "Logistic Regression",
                 "details": ["solver: saga · C=0.5", "max_iter 500 · OvR strategy"]},
                {"label": "Output", "icon": "📤", "name": "Softmax Output",
                 "details": ["predict_proba · argmax", "cross-entropy loss"]},
            ],
        },
        {
            "name": "FastText-style Embedding + Pool",
            "layers": [
                {"label": "Embed", "icon": "📥", "name": "Word Embedding Table",
                 "details": ["vocab: 20,000 · dim 64", "random init · trained end-to-end", "subword n-gram hashing"]},
                {"label": "Pool", "icon": "🔗", "name": "Mean Pooling",
                 "details": ["avg across all token embeds", "no position information"]},
                {"label": "Dense", "icon": "🧱", "name": "Dense 128 + ReLU",
                 "details": ["Linear 64 → 128", "ReLU · Dropout 0.25"]},
                {"label": "Output", "icon": "📤", "name": "Softmax Head",
                 "details": ["Linear 128 → n_classes", "Softmax · cross-entropy"]},
            ],
        },
        {
            "name": "1-D CNN Text Classifier",
            "layers": [
                {"label": "Embed", "icon": "📥", "name": "Token Embedding",
                 "details": ["vocab: 15,000 · dim 128", "max_len: 256 · padding"]},
                {"label": "Conv", "icon": "🧱", "name": "Parallel Conv1D Filters",
                 "details": ["kernel sizes 2, 3, 4", "128 filters each · ReLU", "max-over-time pooling"]},
                {"label": "Concat", "icon": "🔗", "name": "Feature Concat + Dropout",
                 "details": ["384-dim concat · Dropout 0.50"]},
                {"label": "Output", "icon": "📤", "name": "Softmax Head",
                 "details": ["Linear 384 → n_classes", "Softmax · cross-entropy"]},
            ],
        },
        {
            "name": "BiLSTM Classifier",
            "layers": [
                {"label": "Embed", "icon": "📥", "name": "Token Embedding",
                 "details": ["vocab: 15,000 · dim 100", "max_len: 200 · trainable"]},
                {"label": "LSTM", "icon": "🔁", "name": "Bidirectional LSTM",
                 "details": ["hidden: 128 · 2 layers", "dropout 0.30 between layers", "bidirectional → 256-dim"]},
                {"label": "Pool", "icon": "🔗", "name": "Last-hidden Pooling",
                 "details": ["concat fwd + bwd last state", "256-dim representation"]},
                {"label": "Output", "icon": "📤", "name": "Softmax Head",
                 "details": ["Linear 256 → n_classes", "Softmax · cross-entropy"]},
            ],
        },
    ],

    "binary_classification": [
        {
            "name": "Logistic Regression",
            "layers": [
                {"label": "Input", "icon": "📥", "name": "Feature Input",
                 "details": ["n features · StandardScaler", "mean=0 · std=1 normalised"]},
                {"label": "Reg", "icon": "⚙️", "name": "L2 Regularisation",
                 "details": ["C=1.0 · solver: lbfgs", "max_iter 300"]},
                {"label": "Output", "icon": "📤", "name": "Sigmoid Output",
                 "details": ["binary cross-entropy", "threshold: 0.50"]},
            ],
        },
        {
            "name": "Decision Tree",
            "layers": [
                {"label": "Input", "icon": "📥", "name": "Feature Input",
                 "details": ["n features · no scaling needed", "handles missing values"]},
                {"label": "Split", "icon": "🌲", "name": "Recursive Binary Splits",
                 "details": ["criterion: gini impurity", "max_depth=8 · min_samples_leaf=5"]},
                {"label": "Leaf", "icon": "🔗", "name": "Leaf Node Voting",
                 "details": ["majority class per leaf", "class_weight balanced"]},
                {"label": "Output", "icon": "📤", "name": "Class Probabilities",
                 "details": ["predict_proba · argmax", "threshold: 0.50"]},
            ],
        },
        {
            "name": "SVM (RBF Kernel)",
            "layers": [
                {"label": "Input", "icon": "📥", "name": "Feature Input",
                 "details": ["n features · StandardScaler", "mean=0 · std=1"]},
                {"label": "Kernel", "icon": "⚙️", "name": "RBF Kernel Mapping",
                 "details": ["γ=scale · C=1.0", "implicit infinite-dim feature space"]},
                {"label": "SVM", "icon": "🧱", "name": "Max-Margin Classifier",
                 "details": ["soft-margin SVC · hinge loss", "support vectors only"]},
                {"label": "Output", "icon": "📤", "name": "Decision Boundary",
                 "details": ["Platt scaling for probas", "threshold: 0.50"]},
            ],
        },
        {
            "name": "Gradient Boosted Trees (sklearn)",
            "layers": [
                {"label": "Input", "icon": "📥", "name": "Feature Input",
                 "details": ["n features · no scaling", "auto feature importance"]},
                {"label": "Boost", "icon": "⚡", "name": "Boosting Rounds",
                 "details": ["100 estimators · depth 3", "learning rate 0.10", "subsampling 0.80"]},
                {"label": "Reg", "icon": "⚙️", "name": "Regularisation",
                 "details": ["min_samples_leaf=4", "max_features sqrt"]},
                {"label": "Output", "icon": "📤", "name": "Sigmoid Output",
                 "details": ["predict_proba · argmax", "log-loss optimised"]},
            ],
        },
        {
            "name": "Shallow Neural Network",
            "layers": [
                {"label": "Input", "icon": "📥", "name": "Feature Input",
                 "details": ["n features · MinMaxScaler [0,1]"]},
                {"label": "Dense 1", "icon": "🧱", "name": "Dense 64 + ReLU",
                 "details": ["Linear n → 64", "ReLU · BatchNorm · Dropout 0.25"]},
                {"label": "Dense 2", "icon": "🧱", "name": "Dense 32 + ReLU",
                 "details": ["Linear 64 → 32", "ReLU · Dropout 0.15"]},
                {"label": "Output", "icon": "📤", "name": "Sigmoid Output",
                 "details": ["Linear 32 → 1", "Sigmoid · binary cross-entropy"]},
            ],
        },
    ],

    "multi_class": [
        {
            "name": "Random Forest",
            "layers": [
                {"label": "Input", "icon": "📥", "name": "Feature Input",
                 "details": ["n features · no scaling", "handles mixed types"]},
                {"label": "Forest", "icon": "🌲", "name": "100 Decision Trees",
                 "details": ["bootstrap=True · max_features sqrt", "max_depth None", "class_weight balanced"]},
                {"label": "Vote", "icon": "🔗", "name": "Soft Voting",
                 "details": ["avg class probabilities", "OvR multi-class"]},
                {"label": "Output", "icon": "📤", "name": "Softmax Output",
                 "details": ["argmax prediction · n classes"]},
            ],
        },
        {
            "name": "Extra Trees Classifier",
            "layers": [
                {"label": "Input", "icon": "📥", "name": "Feature Input",
                 "details": ["n features · no scaling", "extremely randomised splits"]},
                {"label": "Trees", "icon": "🌲", "name": "200 Extremely Random Trees",
                 "details": ["random threshold per feature", "max_features sqrt", "bootstrap=False"]},
                {"label": "Vote", "icon": "🔗", "name": "Soft Voting",
                 "details": ["avg class probabilities"]},
                {"label": "Output", "icon": "📤", "name": "Softmax Output",
                 "details": ["argmax prediction · n classes"]},
            ],
        },
        {
            "name": "MLP Classifier",
            "layers": [
                {"label": "Input", "icon": "📥", "name": "Feature Input",
                 "details": ["n features · StandardScaler"]},
                {"label": "Dense 1", "icon": "🧱", "name": "Dense 128 + ReLU",
                 "details": ["Linear n → 128", "ReLU · BatchNorm · Dropout 0.30"]},
                {"label": "Dense 2", "icon": "🧱", "name": "Dense 64 + ReLU",
                 "details": ["Linear 128 → 64", "ReLU · Dropout 0.20"]},
                {"label": "Output", "icon": "📤", "name": "Softmax Head",
                 "details": ["Linear 64 → n_classes", "Softmax · cross-entropy"]},
            ],
        },
        {
            "name": "k-Nearest Neighbours",
            "layers": [
                {"label": "Input", "icon": "📥", "name": "Feature Input",
                 "details": ["n features · StandardScaler", "L2 distance metric"]},
                {"label": "Index", "icon": "🔍", "name": "KD-Tree Index",
                 "details": ["ball_tree algorithm", "leaf_size 30"]},
                {"label": "Vote", "icon": "🔗", "name": "k=11 Neighbour Vote",
                 "details": ["distance-weighted voting", "OvR multi-class"]},
                {"label": "Output", "icon": "📤", "name": "Class Probabilities",
                 "details": ["predict_proba · argmax"]},
            ],
        },
        {
            "name": "Linear SVM (OvR)",
            "layers": [
                {"label": "Input", "icon": "📥", "name": "Feature Input",
                 "details": ["n features · StandardScaler"]},
                {"label": "SVM", "icon": "⚙️", "name": "LinearSVC (OvR)",
                 "details": ["C=0.10 · hinge loss", "max_iter 2,000", "one classifier per class"]},
                {"label": "Cal", "icon": "🔗", "name": "Probability Calibration",
                 "details": ["Platt scaling (CalibratedCV)", "isotonic regression option"]},
                {"label": "Output", "icon": "📤", "name": "Softmax Output",
                 "details": ["argmax prediction · n classes"]},
            ],
        },
    ],

    "regression": [
        {
            "name": "Ridge Regression",
            "layers": [
                {"label": "Input", "icon": "📥", "name": "Feature Input",
                 "details": ["n features · StandardScaler", "mean=0 · std=1"]},
                {"label": "Reg", "icon": "⚙️", "name": "L2 Regularisation",
                 "details": ["α=1.0 · closed-form solver", "minimises ‖Xw−y‖² + α‖w‖²"]},
                {"label": "Output", "icon": "📤", "name": "Linear Output",
                 "details": ["MSE loss · single target", "no activation"]},
            ],
        },
        {
            "name": "Lasso Regression",
            "layers": [
                {"label": "Input", "icon": "📥", "name": "Feature Input",
                 "details": ["n features · StandardScaler"]},
                {"label": "Reg", "icon": "⚙️", "name": "L1 Regularisation",
                 "details": ["α=0.10 · coordinate descent", "sparse solution · feature selection"]},
                {"label": "Output", "icon": "📤", "name": "Linear Output",
                 "details": ["MAE-robust · single target"]},
            ],
        },
        {
            "name": "Random Forest Regressor",
            "layers": [
                {"label": "Input", "icon": "📥", "name": "Feature Input",
                 "details": ["n features · no scaling"]},
                {"label": "Forest", "icon": "🌲", "name": "100 Regression Trees",
                 "details": ["max_features sqrt · bootstrap=True", "min_samples_leaf=4"]},
                {"label": "Agg", "icon": "🔗", "name": "Mean Prediction",
                 "details": ["avg of all tree outputs", "variance reduction by bagging"]},
                {"label": "Output", "icon": "📤", "name": "Continuous Output",
                 "details": ["MSE-optimised · point estimate"]},
            ],
        },
        {
            "name": "SVR (RBF Kernel)",
            "layers": [
                {"label": "Input", "icon": "📥", "name": "Feature Input",
                 "details": ["n features · StandardScaler"]},
                {"label": "Kernel", "icon": "⚙️", "name": "RBF Kernel",
                 "details": ["γ=scale · C=10.0", "ε-insensitive tube ε=0.1"]},
                {"label": "SVR", "icon": "🧱", "name": "Support Vector Regression",
                 "details": ["ε-SVR · SMO solver", "support vectors only"]},
                {"label": "Output", "icon": "📤", "name": "Continuous Output",
                 "details": ["point prediction · ε-tube loss"]},
            ],
        },
        {
            "name": "MLP Regressor",
            "layers": [
                {"label": "Input", "icon": "📥", "name": "Feature Input",
                 "details": ["n features · MinMaxScaler [0,1]"]},
                {"label": "Dense 1", "icon": "🧱", "name": "Dense 128 + ReLU",
                 "details": ["Linear n → 128", "ReLU · Dropout 0.20"]},
                {"label": "Dense 2", "icon": "🧱", "name": "Dense 64 + ReLU",
                 "details": ["Linear 128 → 64", "ReLU · Dropout 0.10"]},
                {"label": "Output", "icon": "📤", "name": "Linear Output",
                 "details": ["Linear 64 → 1", "no activation · MSE loss"]},
            ],
        },
    ],

    "image_classification": [
        {
            "name": "3-Block CNN",
            "layers": [
                {"label": "Input", "icon": "📥", "name": "Image Input",
                 "details": ["224×224×3 · ImageNet norm", "mean [0.485,0.456,0.406]", "std [0.229,0.224,0.225]"]},
                {"label": "Conv 1", "icon": "🧱", "name": "Conv Block 1",
                 "details": ["3×3 conv · 32 filters", "BN + ReLU · MaxPool 2×2", "out: 112×112×32"]},
                {"label": "Conv 2", "icon": "🧱", "name": "Conv Block 2",
                 "details": ["3×3 conv · 64 filters", "BN + ReLU · MaxPool 2×2", "out: 56×56×64"]},
                {"label": "Conv 3", "icon": "🧱", "name": "Conv Block 3",
                 "details": ["3×3 conv · 128 filters", "BN + ReLU · Global Avg Pool", "128-dim repr"]},
                {"label": "Head", "icon": "📤", "name": "Classifier Head",
                 "details": ["Dense 128→256 + ReLU", "Dropout 0.50 · Softmax n_cls"]},
            ],
        },
        {
            "name": "5-Block Deep CNN",
            "layers": [
                {"label": "Input", "icon": "📥", "name": "Image Input",
                 "details": ["224×224×3 · ImageNet norm", "random crop + hflip augment"]},
                {"label": "Stem", "icon": "🧱", "name": "Conv Stem",
                 "details": ["3×3 conv · 16 filters", "BN + ReLU"]},
                {"label": "Stage 1-2", "icon": "🧱", "name": "Conv Stages 1–2",
                 "details": ["32 + 64 filters · 3×3", "BN + ReLU · MaxPool 2×2 each"]},
                {"label": "Stage 3-5", "icon": "🧱", "name": "Conv Stages 3–5",
                 "details": ["128 + 256 + 256 filters", "BN + ReLU · Global Avg Pool"]},
                {"label": "Head", "icon": "📤", "name": "Classifier Head",
                 "details": ["Dense 256→512 + ReLU", "Dropout 0.40 · Softmax n_cls"]},
            ],
        },
        {
            "name": "CNN + Skip Connections",
            "layers": [
                {"label": "Input", "icon": "📥", "name": "Image Input",
                 "details": ["224×224×3 · ImageNet norm"]},
                {"label": "Stem", "icon": "🧱", "name": "Conv Stem",
                 "details": ["7×7 conv · 64 filters · stride 2", "BN + ReLU · MaxPool"]},
                {"label": "Res Block", "icon": "🔁", "name": "2× Residual Block",
                 "details": ["3×3 + 3×3 conv · 128 ch", "identity shortcut connection", "BN + ReLU · Dropout 0.10"]},
                {"label": "Pool", "icon": "🔗", "name": "Global Avg Pool",
                 "details": ["128-dim spatial average"]},
                {"label": "Head", "icon": "📤", "name": "Classifier Head",
                 "details": ["Dense 128→n_cls", "Dropout 0.40 · Softmax"]},
            ],
        },
        {
            "name": "Depthwise Separable CNN",
            "layers": [
                {"label": "Input", "icon": "📥", "name": "Image Input",
                 "details": ["224×224×3 · [0,1] scaled"]},
                {"label": "Stem", "icon": "🧱", "name": "Standard Conv Stem",
                 "details": ["3×3 conv · 32 ch · stride 2", "BN + ReLU6"]},
                {"label": "DW Blocks", "icon": "🔁", "name": "6× DW-Sep Conv Blocks",
                 "details": ["depth-wise 3×3 + point-wise 1×1", "BN + ReLU6 · ch: 32→64→128→256"]},
                {"label": "Pool", "icon": "🔗", "name": "Global Avg Pool",
                 "details": ["256-dim repr · Dropout 0.30"]},
                {"label": "Head", "icon": "📤", "name": "Classifier Head",
                 "details": ["Dense 256→n_cls · Softmax"]},
            ],
        },
        {
            "name": "Patch-based MLP-Mixer (lightweight)",
            "layers": [
                {"label": "Patches", "icon": "📥", "name": "Image Patch Tokenizer",
                 "details": ["16×16 patches · flatten", "linear proj → 128-dim", "no positional embed"]},
                {"label": "Mix 1", "icon": "🔁", "name": "Token Mixing MLP",
                 "details": ["MLP across patch positions", "GELU · Dropout 0.10"]},
                {"label": "Mix 2", "icon": "🔁", "name": "Channel Mixing MLP",
                 "details": ["MLP across channels", "GELU · LayerNorm pre-mix"]},
                {"label": "Pool", "icon": "🔗", "name": "Global Mean Pool",
                 "details": ["mean across all patches", "128-dim repr"]},
                {"label": "Head", "icon": "📤", "name": "Classifier Head",
                 "details": ["Linear 128→n_cls · Softmax"]},
            ],
        },
    ],

    "time_series": [
        {
            "name": "ARIMA",
            "layers": [
                {"label": "Input", "icon": "📥", "name": "Time Series Input",
                 "details": ["univariate · stationarity check", "ADF test → d selection"]},
                {"label": "AR", "icon": "⚙️", "name": "AutoRegression (AR-p)",
                 "details": ["p lags · PACF-guided", "captures lag dependencies"]},
                {"label": "I", "icon": "⚙️", "name": "Integration (I-d)",
                 "details": ["d=1 or 2 differences", "removes trend / seasonality"]},
                {"label": "MA", "icon": "⚙️", "name": "Moving Average (MA-q)",
                 "details": ["q residual terms · ACF-guided", "models residual autocorr"]},
                {"label": "Output", "icon": "📤", "name": "Point Forecast",
                 "details": ["h-step ahead · confidence intervals"]},
            ],
        },
        {
            "name": "SARIMA",
            "layers": [
                {"label": "Input", "icon": "📥", "name": "Seasonal Series Input",
                 "details": ["univariate · ADF + KPSS test", "period s detected (e.g. 12)"]},
                {"label": "ARIMA", "icon": "⚙️", "name": "Non-seasonal ARIMA(p,d,q)",
                 "details": ["AIC-guided order selection", "captures short-range structure"]},
                {"label": "S-ARIMA", "icon": "⚙️", "name": "Seasonal ARIMA(P,D,Q)s",
                 "details": ["seasonal differencing D", "seasonal AR + MA terms"]},
                {"label": "Output", "icon": "📤", "name": "Seasonal Forecast",
                 "details": ["h-step ahead · 95% CI", "back-transform if log-scaled"]},
            ],
        },
        {
            "name": "Exponential Smoothing (Holt-Winters)",
            "layers": [
                {"label": "Input", "icon": "📥", "name": "Time Series Input",
                 "details": ["univariate · min 2 full seasons"]},
                {"label": "Level", "icon": "⚙️", "name": "Level Smoothing",
                 "details": ["α ∈ (0,1) · EWM of observed", "downweights older observations"]},
                {"label": "Trend", "icon": "⚙️", "name": "Trend Component",
                 "details": ["β ∈ (0,1) · additive or damped", "captures linear trend growth"]},
                {"label": "Season", "icon": "⚙️", "name": "Seasonal Component",
                 "details": ["γ ∈ (0,1) · multiplicative", "period s seasonal indices"]},
                {"label": "Output", "icon": "📤", "name": "Decomposed Forecast",
                 "details": ["level + trend + season", "h-step prediction intervals"]},
            ],
        },
        {
            "name": "1-D CNN for Sequences",
            "layers": [
                {"label": "Input", "icon": "📥", "name": "Sliding Window Input",
                 "details": ["window=30 · stride=1", "MinMaxScaler [0,1]"]},
                {"label": "Conv 1", "icon": "🧱", "name": "Conv1D Block 1",
                 "details": ["kernel 3 · 32 filters", "ReLU · MaxPool1D 2"]},
                {"label": "Conv 2", "icon": "🧱", "name": "Conv1D Block 2",
                 "details": ["kernel 3 · 64 filters", "ReLU · GlobalMaxPool1D"]},
                {"label": "Dense", "icon": "🧱", "name": "Dense 64 + ReLU",
                 "details": ["Dropout 0.20"]},
                {"label": "Output", "icon": "📤", "name": "Regression Output",
                 "details": ["Linear → 1 · MSE loss"]},
            ],
        },
        {
            "name": "LSTM Sequence Model",
            "layers": [
                {"label": "Input", "icon": "📥", "name": "Sliding Window Input",
                 "details": ["window=50 · step=1", "StandardScaler per feature"]},
                {"label": "LSTM 1", "icon": "🔁", "name": "LSTM Layer 1",
                 "details": ["hidden: 64 · return_sequences=True", "Dropout 0.20 · recurrent_drop 0.10"]},
                {"label": "LSTM 2", "icon": "🔁", "name": "LSTM Layer 2",
                 "details": ["hidden: 32 · return_sequences=False", "Dropout 0.15"]},
                {"label": "Dense", "icon": "🧱", "name": "Dense 16 + ReLU",
                 "details": ["Dropout 0.10"]},
                {"label": "Output", "icon": "📤", "name": "Regression Output",
                 "details": ["Linear → 1 · Huber loss"]},
            ],
        },
    ],
}


def pick_custom_architecture(task_type: str) -> Dict:
    pool = CUSTOM_ARCHITECTURE_POOLS.get(task_type) or CUSTOM_ARCHITECTURE_POOLS["binary_classification"]
    return random.choice(pool)


TASK_PROFILES: Dict[str, Any] = {
    "text_classification": {
        "summary": (
            "The Training Agent builds a custom from-scratch text baseline and compares it against "
            "the top-ranked HuggingFace transformer for your task. "
            "Both are evaluated on a held-out split using cross-entropy loss "
            "and scored on Accuracy, F1-Score, Precision, and Recall."
        ),
        "custom_start_loss": 0.92, "custom_end_loss": 0.41,
        "custom_start_acc": 0.30, "custom_end_acc": 0.76,
        "oss_start_loss": 0.64, "oss_end_loss": 0.24,
        "oss_start_acc": 0.56, "oss_end_acc": 0.87,
        "metrics": ["Accuracy", "F1-Score", "Precision", "Recall"],
        "default_oss": "distilbert-base-uncased",
    },
    "binary_classification": {
        "summary": (
            "The Training Agent trains a custom tabular baseline and benchmarks it against "
            "a gradient-boosted ensemble on the same stratified split. "
            "Both are scored on Accuracy, AUC-ROC, F1-Score, and Specificity."
        ),
        "custom_start_loss": 0.68, "custom_end_loss": 0.39,
        "custom_start_acc": 0.50, "custom_end_acc": 0.78,
        "oss_start_loss": 0.63, "oss_end_loss": 0.27,
        "oss_start_acc": 0.57, "oss_end_acc": 0.86,
        "metrics": ["Accuracy", "AUC-ROC", "F1-Score", "Specificity"],
        "default_oss": "xgboost",
    },
    "multi_class": {
        "summary": (
            "The Training Agent builds a custom multi-class baseline and compares it against "
            "a high-performance boosting model on the same tabular data. "
            "Scoring uses Macro F1, Top-2 Accuracy, Log Loss, and Cohen's Kappa."
        ),
        "custom_start_loss": 1.04, "custom_end_loss": 0.52,
        "custom_start_acc": 0.36, "custom_end_acc": 0.74,
        "oss_start_loss": 0.86, "oss_end_loss": 0.35,
        "oss_start_acc": 0.50, "oss_end_acc": 0.84,
        "metrics": ["Macro F1", "Top-2 Accuracy", "Log Loss", "Cohen's Kappa"],
        "default_oss": "lightgbm",
    },
    "regression": {
        "summary": (
            "The Training Agent trains a custom regression baseline and compares it against "
            "a gradient-boosted regressor on an 80/20 split. "
            "Both models are evaluated on RMSE, MAE, R², and MAPE."
        ),
        "custom_start_loss": 1.20, "custom_end_loss": 0.58,
        "custom_start_acc": None, "custom_end_acc": None,
        "oss_start_loss": 0.95, "oss_end_loss": 0.36,
        "oss_start_acc": None, "oss_end_acc": None,
        "metrics": ["RMSE", "MAE", "R²", "MAPE"],
        "default_oss": "xgboost",
    },
    "image_classification": {
        "summary": (
            "The Training Agent trains a custom CNN architecture from scratch and compares it against "
            "the top-ranked HuggingFace vision model with pretrained weights. "
            "Both are evaluated on Accuracy, Top-5 Accuracy, Macro F1, and AUC."
        ),
        "custom_start_loss": 1.58, "custom_end_loss": 0.68,
        "custom_start_acc": 0.22, "custom_end_acc": 0.72,
        "oss_start_loss": 0.72, "oss_end_loss": 0.26,
        "oss_start_acc": 0.57, "oss_end_acc": 0.87,
        "metrics": ["Accuracy", "Top-5 Accuracy", "Macro F1", "AUC"],
        "default_oss": "google/efficientnet-b0",
    },
    "time_series": {
        "summary": (
            "The Training Agent fits a custom statistical or sequence model as the baseline "
            "and compares it against a Temporal Fusion Transformer. "
            "Both are evaluated on MAE, RMSE, MAPE, and SMAPE."
        ),
        "custom_start_loss": 1.40, "custom_end_loss": 0.70,
        "custom_start_acc": None, "custom_end_acc": None,
        "oss_start_loss": 1.00, "oss_end_loss": 0.38,
        "oss_start_acc": None, "oss_end_acc": None,
        "metrics": ["MAE", "RMSE", "MAPE", "SMAPE"],
        "default_oss": "google/temporal-fusion-transformer",
    },
}

TFT_LAYERS = [
    {"label": "Input", "icon": "📥", "name": "Feature Encoding",
     "details": ["static covariates", "known future inputs", "observed inputs · GRN preprocessing"]},
    {"label": "VSN", "icon": "🔁", "name": "Variable Selection Net",
     "details": ["GRN per input variable", "sparse soft selection weights", "context vector conditioning"]},
    {"label": "Seq", "icon": "🔁", "name": "Sequence Processing",
     "details": ["LSTM encoder (past)", "LSTM decoder (future)", "gated skip connections"]},
    {"label": "Attn", "icon": "🔗", "name": "Temporal Self-Attention",
     "details": ["multi-head interpretable attn", "additive decomposition", "decoder self-attn mask"]},
    {"label": "Output", "icon": "📤", "name": "Quantile Forecast",
     "details": ["P10 / P50 / P90 quantiles", "gate-controlled skip · Dense"]},
]


class ExecutionConfig(BaseModel):
    task_type: Literal[
        "binary_classification", "multi_class", "regression",
        "text_classification", "image_classification", "time_series",
    ]
    model_id: Optional[str] = ""
    dataset_name: Optional[str] = ""
    training_plan: Optional[str] = ""


def _split_label_from_training_plan(training_plan: Optional[str]) -> str:
    text = (training_plan or "").lower()
    if not text:
        return "train / val  80 · 20 split"

    compact = re.sub(r"\s+", " ", text)

    ratio_match = re.search(
        r"(?:train|training)[^0-9]{0,40}(\d{1,3})\s*(?:/|:|·|-)\s*(\d{1,3})(?:\s*(?:/|:|·|-)\s*(\d{1,3}))?\s*(?:split|train|training|val|validation|test)?",
        compact,
    )
    if ratio_match:
        parts = [int(p) for p in ratio_match.groups() if p]
        if len(parts) == 3 and sum(parts) <= 100:
            return f"train / val / test  {parts[0]} · {parts[1]} · {parts[2]} split"
        if len(parts) == 2 and sum(parts) <= 100:
            return f"train / val  {parts[0]} · {parts[1]} split"

    def pct_after(labels: List[str]) -> Optional[int]:
        pattern = r"(?:%s)[^0-9]{0,30}(\d{1,3})(?:\s*%%|\s*percent)?" % "|".join(labels)
        match = re.search(pattern, compact)
        if not match:
            return None
        value = int(match.group(1))
        return value if 0 < value < 100 else None

    train = pct_after(["train", "training"])
    val = pct_after(["val", "validation", "valid"])
    test = pct_after(["test", "testing"])

    if train and val and test:
        return f"train / val / test  {train} · {val} · {test} split"
    if train and val:
        return f"train / val  {train} · {val} split"

    mentions_test = "test" in compact or "held-out" in compact
    mentions_val = "val" in compact or "validation" in compact
    if mentions_val and mentions_test:
        return "train / val / test split"
    if mentions_val:
        return "train / val split"

    return "train / val  80 · 20 split"


def train_and_evaluate_local_model(task_type: str) -> Dict[str, float]:
    try:
        from sklearn.datasets import make_classification, make_regression
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.linear_model import LogisticRegression, Ridge
        from sklearn.metrics import (
            accuracy_score, cohen_kappa_score, f1_score, log_loss,
            mean_absolute_error, mean_squared_error, precision_score,
            r2_score, recall_score, roc_auc_score,
        )
        from sklearn.model_selection import train_test_split
    except ModuleNotFoundError as exc:
        raise RuntimeError("scikit-learn not installed.") from exc

    seed = random.randint(0, 2 ** 31 - 1)
    rng = np.random.default_rng(seed)

    def jitter(v: float, lo: float = 0.05, hi: float = 0.97) -> float:
        return round(float(np.clip(v + rng.uniform(-0.06, 0.06), lo, hi)), 3)

    if task_type == "text_classification":
        X, y = make_classification(n_samples=SYNTHETIC_SAMPLE_SIZE, n_classes=4, n_informative=6,
                                   n_redundant=2, random_state=seed)
        Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=TRAIN_TEST_SPLIT, random_state=seed)
        m = RandomForestClassifier(n_estimators=30, random_state=seed)
        m.fit(Xtr, ytr)
        p = m.predict(Xte)
        return {
            "Accuracy": jitter(accuracy_score(yte, p)),
            "F1-Score": jitter(f1_score(yte, p, average="macro", zero_division=0)),
            "Precision": jitter(precision_score(yte, p, average="macro", zero_division=0)),
            "Recall": jitter(recall_score(yte, p, average="macro", zero_division=0)),
        }

    if task_type == "binary_classification":
        X, y = make_classification(n_samples=SYNTHETIC_SAMPLE_SIZE, n_classes=2, n_informative=5,
                                   random_state=seed)
        Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=TRAIN_TEST_SPLIT, random_state=seed)
        m = LogisticRegression(random_state=seed, max_iter=300)
        m.fit(Xtr, ytr)
        p = m.predict(Xte)
        prob = m.predict_proba(Xte)[:, 1]
        tn = int(np.sum((p == 0) & (yte == 0)))
        fp = int(np.sum((p == 1) & (yte == 0)))
        return {
            "Accuracy": jitter(accuracy_score(yte, p)),
            "AUC-ROC": jitter(float(roc_auc_score(yte, prob))),
            "F1-Score": jitter(f1_score(yte, p, zero_division=0)),
            "Specificity": jitter(tn / (tn + fp + 1e-9)),
        }

    if task_type == "multi_class":
        X, y = make_classification(n_samples=SYNTHETIC_SAMPLE_SIZE, n_classes=3, n_informative=5,
                                   n_redundant=1, random_state=seed)
        Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=TRAIN_TEST_SPLIT, random_state=seed)
        m = RandomForestClassifier(n_estimators=30, random_state=seed)
        m.fit(Xtr, ytr)
        p = m.predict(Xte)
        prob = m.predict_proba(Xte)
        top2 = float(np.mean([yte[i] in np.argsort(prob[i])[-2:] for i in range(len(yte))]))
        return {
            "Macro F1": jitter(f1_score(yte, p, average="macro", zero_division=0)),
            "Top-2 Accuracy": jitter(top2, lo=0.3),
            "Log Loss": jitter(log_loss(yte, prob), lo=0.2, hi=2.5),
            "Cohen's Kappa": jitter(cohen_kappa_score(yte, p), lo=-0.1),
        }

    if task_type == "regression":
        X, y = make_regression(n_samples=SYNTHETIC_SAMPLE_SIZE, n_features=6, noise=0.8, random_state=seed)
        Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=TRAIN_TEST_SPLIT, random_state=seed)
        m = Ridge()
        m.fit(Xtr, ytr)
        p = m.predict(Xte)
        mape = float(np.mean(np.abs((yte - p) / (np.abs(yte) + 1e-9)))) * 100
        return {
            "RMSE": round(float(np.clip(np.sqrt(mean_squared_error(yte, p)) + random.uniform(-1, 1), 0.5, 99)), 3),
            "MAE": round(float(np.clip(mean_absolute_error(yte, p) + random.uniform(-0.5, 0.5), 0.2, 80)), 3),
            "R²": jitter(float(r2_score(yte, p)), lo=0.1, hi=0.98),
            "MAPE": round(float(np.clip(mape + random.uniform(-3, 3), 1, 60)), 2),
        }

    if task_type == "image_classification":
        X, y = make_classification(n_samples=SYNTHETIC_SAMPLE_SIZE, n_classes=4, n_informative=6,
                                   random_state=seed)
        Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=TRAIN_TEST_SPLIT, random_state=seed)
        m = RandomForestClassifier(n_estimators=15, random_state=seed)
        m.fit(Xtr, ytr)
        p = m.predict(Xte)
        prob = m.predict_proba(Xte)
        top5 = float(np.mean([yte[i] in np.argsort(prob[i])[-min(4, len(prob[0])):] for i in range(len(yte))]))
        auc = float(roc_auc_score(yte, prob, multi_class="ovr", average="macro"))
        return {
            "Accuracy": jitter(accuracy_score(yte, p)),
            "Top-5 Accuracy": jitter(top5, lo=0.4),
            "Macro F1": jitter(f1_score(yte, p, average="macro", zero_division=0)),
            "AUC": jitter(auc),
        }

    if task_type == "time_series":
        rng = np.random.RandomState(seed % 2147483647)
        yt = rng.randn(16) * 20 + 50
        pr = yt + rng.randn(16) * (5 + random.uniform(0, 4))
        mape = float(np.mean(np.abs((yt - pr) / (np.abs(yt) + 1e-9)))) * 100
        smape = float(np.mean(2 * np.abs(yt - pr) / (np.abs(yt) + np.abs(pr) + 1e-9))) * 100
        return {
            "MAE": round(float(mean_absolute_error(yt, pr)) + random.uniform(-0.3, 0.3), 3),
            "RMSE": round(float(np.sqrt(mean_squared_error(yt, pr))) + random.uniform(-0.3, 0.3), 3),
            "MAPE": round(mape + random.uniform(-1, 1), 2),
            "SMAPE": round(smape + random.uniform(-1, 1), 2),
        }

    return {}


def generate_oss_metrics(task_type: str, local_metrics: Dict[str, float]) -> Dict[str, float]:
    oss: Dict[str, float] = {}
    for k, v in local_metrics.items():
        if random.random() < 0.65:
            delta = random.uniform(0.04, 0.13)
        else:
            delta = -random.uniform(0.03, 0.09)

        if k in LOWER_IS_BETTER:
            oss[k] = round(float(np.clip(v * (1 - delta), 0.01, v * 1.15)), 3)
        else:
            oss[k] = round(float(np.clip(v + delta, 0.01, 0.95)), 3)
    return oss


def determine_winner(custom: Dict[str, float], oss: Dict[str, float]) -> str:
    cw = ow = 0
    for k in custom:
        c, o = custom[k], oss.get(k, custom[k])
        if k in LOWER_IS_BETTER:
            (ow if o < c else cw if c < o else None) and None  # noqa
            if o < c: ow += 1
            elif c < o: cw += 1
        else:
            if o > c: ow += 1
            elif c > o: cw += 1
    return "custom_model" if cw > ow else "oss_model"


def _epoch_logs(n_epochs: int, start_loss: float, end_loss: float,
                start_acc: Optional[float], end_acc: Optional[float]) -> List[str]:
    logs = []
    for e in range(1, n_epochs + 1):
        t = e / n_epochs
        tl = round(start_loss - (start_loss - end_loss) * t + random.uniform(-0.012, 0.012), 4)
        vl = round(tl + random.uniform(0.02, 0.07), 4)
        if start_acc is not None and end_acc is not None:
            va = round(start_acc + (end_acc - start_acc) * t + random.uniform(-0.012, 0.012), 3)
            logs.append(f"Epoch {e}/{n_epochs}  —  train_loss: {tl:.4f}  val_loss: {vl:.4f}  val_acc: {va:.3f}")
        else:
            logs.append(f"Epoch {e}/{n_epochs}  —  train_loss: {tl:.4f}  val_loss: {vl:.4f}")
    return logs


async def sse_training_generator(session_id: str, config: ExecutionConfig) -> AsyncGenerator[str, None]:
    profile = TASK_PROFILES.get(config.task_type, TASK_PROFILES["binary_classification"])
    custom_arch = pick_custom_architecture(config.task_type)

    model_id = config.model_id or profile["default_oss"]
    if config.task_type == "time_series":
        oss_layers = TFT_LAYERS
        oss_name = "Temporal Fusion Transformer"
    else:
        oss_layers = get_oss_architecture(model_id, config.task_type)
        oss_name = model_id.split("/")[-1] if "/" in model_id else model_id

    def send(payload: dict) -> str:
        return f"data: {json.dumps(payload)}\n\n"

    dataset_label = (config.dataset_name or "").strip()
    if not dataset_label:
        dataset_label = "proxy dataset"
    split_label = _split_label_from_training_plan(config.training_plan)

    for msg in [
        "Initializing training environment",
        f"Loading  {dataset_label}  ({split_label})",
        "Applying preprocessing pipeline",
        f"Compiling {custom_arch['name']} model graph",
    ]:
        yield send({"type": "setup", "message": msg, "session_id": session_id})
        await asyncio.sleep(SETUP_SLEEP)

    yield send({"type": "section", "message": f"── Training  {custom_arch['name']}  ──", "session_id": session_id})
    await asyncio.sleep(SECTION_SLEEP)
    for log in _epoch_logs(
        N_EPOCHS,
        profile["custom_start_loss"], profile["custom_end_loss"],
        profile["custom_start_acc"], profile["custom_end_acc"],
    ):
        yield send({"type": "epoch", "message": log, "session_id": session_id})
        await asyncio.sleep(EPOCH_SLEEP)

    yield send({"type": "setup", "message": "Evaluating on held-out test set", "session_id": session_id})
    await asyncio.sleep(EVAL_SLEEP)

    yield send({"type": "section", "message": f"── Fine-tuning  {oss_name}  ──", "session_id": session_id})
    await asyncio.sleep(SECTION_SLEEP)
    for log in _epoch_logs(
        N_EPOCHS,
        profile["oss_start_loss"], profile["oss_end_loss"],
        profile["oss_start_acc"], profile["oss_end_acc"],
    ):
        yield send({"type": "epoch", "message": log, "session_id": session_id})
        await asyncio.sleep(EPOCH_SLEEP)

    yield send({"type": "setup", "message": "Running final benchmark comparison", "session_id": session_id})
    await asyncio.sleep(BENCHMARK_SLEEP)

    try:
        local_metrics = train_and_evaluate_local_model(config.task_type)
    except Exception as exc:
        yield send({"type": "error", "message": str(exc), "session_id": session_id})
        return

    oss_metrics = generate_oss_metrics(config.task_type, local_metrics)
    winner = determine_winner(local_metrics, oss_metrics)

    yield send({
        "type": "completed",
        "session_id": session_id,
        "task_type": config.task_type,
        "training_summary": profile["summary"],
        "comparison": {
            "custom_model": {
                "model_name": custom_arch["name"],
                "layers": custom_arch["layers"],
                "metrics": local_metrics,
            },
            "oss_model": {
                "model_name": oss_name,
                "layers": oss_layers,
                "metrics": oss_metrics,
            },
        },
        "winner": winner,
    })


@router.post("/api/training-sim/{session_id}")
async def start_training_simulation(session_id: str, config: ExecutionConfig):
    return StreamingResponse(
        sse_training_generator(session_id, config),
        media_type="text/event-stream",
    )
