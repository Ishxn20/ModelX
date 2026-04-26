import type { AgentMessage, MLBlueprint, ProjectData } from './types';

export const mockProjectData: ProjectData = {
  project_title: 'Plant Disease Helper',
  idea: 'Classify plant leaf photos by disease so a beginner gardener can decide what to inspect next.',
  goal: 'Given a photo of a plant leaf, suggest whether it looks healthy or shows common disease symptoms.',
  skill_level: 'beginner',
  data_status: 'need_public_dataset',
  data_description: 'Leaf images with labels like healthy, powdery mildew, rust, and blight.',
  constraints: 'Keep the first version small enough for a school project.',
};

const agentMessageTemplates: Record<string, string[]> = {
  dataset_agent: [
    'I am turning the idea into data requirements: one example should be one clear leaf image plus a disease label.',
    'A first prototype can use public plant disease image datasets, but the labels need to match the diseases the user wants to recognize.',
    'The main data risks are blurry photos, uneven lighting, duplicate images, and a model that only works for plants represented in the dataset.',
  ],
  model_agent: [
    'This is an image classification task because the model chooses one category for each leaf photo.',
    'The best baseline is a small transfer-learning image classifier, starting from a pretrained model instead of training from scratch.',
    'A stretch version could compare multiple pretrained image models after the baseline works.',
  ],
  training_agent: [
    'The training recipe starts with resizing images, normalizing pixels, and separating train, validation, and test folders.',
    'A beginner-friendly split is 70 percent train, 15 percent validation, and 15 percent test, grouped so near-duplicate images do not leak across splits.',
    'Watch for overfitting: if training accuracy rises but validation accuracy stalls, the model is memorizing instead of learning.',
  ],
  evaluation_agent: [
    'Accuracy is useful, but per-class precision and recall matter because missing a disease can be more serious than a harmless false alarm.',
    'Manual tests should include bright, dim, messy, and healthy leaf photos that were not used during training.',
    'The first prototype should clearly say “not sure” for low-confidence or out-of-scope images.',
  ],
  kaggle_agent: [
    'Analyzing the Dataset Agent output to understand the domain and data type needed.',
    'Searching Kaggle with queries: "plant disease leaf images classification", "plant leaf dataset labeled", "agriculture crop disease dataset".',
    'Found 12 candidate datasets across 3 searches. Filtering and ranking by task relevance and quality.',
  ],
  huggingface_agent: [
    'Analyzing the Model Agent output — task type is image-classification with pipeline_tag "image-classification".',
    'Searching HuggingFace with queries: "plant disease image classification fine-tuned", "efficientnet plant classification", "resnet agriculture disease".',
    'Found 9 candidate models. Ranking by task match, domain relevance, and download popularity.',
  ],
  compatibility_agent: [
    'Reviewing the top Kaggle dataset (Plant Village Dataset) and top HuggingFace model (MobileNet v2 plant disease).',
    'Evaluating 5 compatibility dimensions: format alignment, size and scale, label alignment, feature engineering, and risks.',
    'Compatibility score: High. The dataset and model are well-matched for a beginner fine-tuning workflow.',
  ],
  modelx_guide: [
    'I am synthesizing the agent discussion into one ML Blueprint.',
    'The recommended path is to start simple with a small public dataset, a baseline image classifier, and clear evaluation checks.',
    'Final blueprint ready.',
  ],
};

export const generateMockMessages = (agentId: string, count: number): AgentMessage[] => {
  const templates = agentMessageTemplates[agentId as keyof typeof agentMessageTemplates] || ['Working...'];

  return templates.slice(0, count).map((message, index) => ({
    agent: agentId,
    message,
    message_type: 'info',
    timestamp: Date.now() + index * 1000,
  }));
};

export const mockBlueprint: MLBlueprint = {
  kaggle_datasets: [
    {
      rank: 1,
      title: 'Plant Village Dataset',
      url: 'https://www.kaggle.com/datasets/emmarex/plantdisease',
      description: '54,306 images of plant leaves across 38 disease categories, healthy and diseased.',
      relevance_reason: 'Directly matches the plant disease classification task with labeled leaf images.',
      vote_count: 1842,
      download_count: 87300,
    },
    {
      rank: 2,
      title: 'New Plant Diseases Dataset',
      url: 'https://www.kaggle.com/datasets/vipoooool/new-plant-diseases-dataset',
      description: '87,000 RGB images of healthy and diseased crop leaves split into 38 classes.',
      relevance_reason: 'Augmented version of PlantVillage — larger and more balanced, good for training.',
      vote_count: 1124,
      download_count: 52100,
    },
    {
      rank: 3,
      title: 'Rice Leaf Diseases',
      url: 'https://www.kaggle.com/datasets/nizorogbezuode/rice-leaf-images',
      description: 'Images of rice leaves with labels for blast, brownspot, and hispa diseases.',
      relevance_reason: 'Crop-specific alternative if the project focuses on a single plant species.',
      vote_count: 312,
      download_count: 14200,
    },
  ],
  recommendation: 'START_SIMPLE',
  summary:
    'Start with a small image classification prototype that recognizes a few common plant leaf conditions from labeled photos.',
  problem_framing:
    'The model should learn to map a clear leaf photo to one of a small set of labels, such as healthy, rust, or powdery mildew. It should not diagnose every plant disease or replace expert advice.',
  dataset_plan:
    'Use a public plant disease image dataset for the first version. Keep only labels that match the project goal, remove duplicates, and inspect examples by hand for blurry images or inconsistent labels. Avoid using private photos unless you have permission.',
  model_plan:
    'Frame this as image classification. Start with a pretrained image classifier and fine-tune it on the selected labels. A stretch goal is to compare two pretrained models after the baseline is working.',
  training_plan:
    'Resize images to one consistent size, split data into train, validation, and test sets, and train the baseline for a small number of epochs first. Watch validation accuracy and loss so you can spot overfitting early.',
  evaluation_plan:
    'Use accuracy for the overall score, then inspect precision and recall for each disease class. Test with photos in different lighting and include a low-confidence path when the model is unsure.',
  debate_summary:
    'The agents agreed the idea is a good beginner image classification project. The Dataset Agent emphasized label quality, while the Evaluation Agent warned that the model should not make medical-style claims.',
  huggingface_models: [
    {
      rank: 1,
      model_id: 'linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification',
      url: 'https://huggingface.co/linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification',
      task_type: 'image-classification',
      relevance_reason: 'Fine-tuned specifically for plant disease identification — direct task and domain match.',
      downloads: 28400,
      likes: 67,
    },
    {
      rank: 2,
      model_id: 'google/efficientnet-b4',
      url: 'https://huggingface.co/google/efficientnet-b4',
      task_type: 'image-classification',
      relevance_reason: 'Strong baseline image classifier; efficient and well-documented for beginners to fine-tune.',
      downloads: 412000,
      likes: 890,
    },
    {
      rank: 3,
      model_id: 'microsoft/resnet-50',
      url: 'https://huggingface.co/microsoft/resnet-50',
      task_type: 'image-classification',
      relevance_reason: 'Classic ResNet-50 backbone widely used in plant disease transfer learning tutorials.',
      downloads: 1850000,
      likes: 2100,
    },
  ],
  compatibility_result: {
    chosen_dataset: 'Plant Village Dataset',
    chosen_dataset_url: 'https://www.kaggle.com/datasets/emmarex/plantdisease',
    chosen_model: 'linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification',
    chosen_model_url: 'https://huggingface.co/linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification',
    compatibility_score: 'High',
    why_this_pair: 'The Plant Village dataset uses the same 38-class structure that this MobileNet model was fine-tuned on, making them a near-perfect match. A beginner can load the model weights and fine-tune on a subset of Plant Village classes in a few hours.',
    preprocessing_dimensions: [
      {
        dimension: 'Format Alignment',
        status: 'Ready',
        description: 'Both the dataset (JPEG images) and the model (224×224 RGB input) use a standard image format.',
        steps: [
          'Download images from Kaggle and organize them into class folders.',
          'Verify all images are JPEG or PNG — convert any that are not.',
        ],
      },
      {
        dimension: 'Size and Scale',
        status: 'Minor Prep',
        description: 'Images in the dataset vary in size; the model expects 224×224 pixels.',
        steps: [
          'Resize all images to 224×224 before training.',
          'Normalize pixel values to the [0, 1] range.',
          'Apply basic augmentations (random flip, small rotation) to add variety.',
        ],
      },
      {
        dimension: 'Label and Target Alignment',
        status: 'Ready',
        description: 'Plant Village class names match the categories the model was fine-tuned on.',
        steps: [
          'Keep only the disease classes your project needs (3–5 for a first prototype).',
          'Map folder names to integer class indices for your training framework.',
        ],
      },
      {
        dimension: 'Feature Engineering',
        status: 'Minor Prep',
        description: 'MobileNet benefits from ImageNet-style normalization; the raw pixel values need adjustment.',
        steps: [
          'Apply mean subtraction and standard deviation normalization (ImageNet stats: mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]).',
          'Use a data loader that applies these transforms on the fly during training.',
        ],
      },
      {
        dimension: 'Risks and Tradeoffs',
        status: 'Minor Prep',
        description: 'The dataset is large; training on all 38 classes at once may be slow and confusing for a first project.',
        steps: [
          'Start with 3–5 classes instead of all 38 to keep training fast and results interpretable.',
          'Inspect misclassified examples manually after the first training run.',
          'Watch for class imbalance — some diseases have far more images than others.',
        ],
      },
    ],
    estimated_effort: '~2–3 hours of setup and data preparation',
  },
  next_steps: [
    'Choose 3 to 5 plant conditions for the first version.',
    'Find a public dataset with those labels and inspect at least 30 examples per class.',
    'Create train, validation, and test splits before training.',
    'Train a simple pretrained image classifier baseline.',
    'Evaluate per-class results and collect hard examples for the next dataset pass.',
  ],
  glossary: [
    {
      term: 'Label',
      definition: 'The answer the model learns from, such as healthy or rust for a leaf image.',
    },
    {
      term: 'Baseline',
      definition: 'A simple first model used to check whether the project is working before trying advanced ideas.',
    },
    {
      term: 'Overfitting',
      definition: 'When a model memorizes training examples and performs worse on new examples.',
    },
  ],
};
