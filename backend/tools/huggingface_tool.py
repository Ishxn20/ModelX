import json
import logging
from typing import Optional, Type

from crewai.tools import BaseTool
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

HF_SEARCH_LIMIT = 20
HF_RESULTS_CAP = 10
HF_SHORT_QUERY_WORDS = 2


class HuggingFaceSearchInput(BaseModel):
    query: str = Field(
        description=(
            "Targeted search query combining task type, domain, and architecture hints. "
            "Example: 'image classification plant disease resnet'"
        )
    )
    pipeline_tag: Optional[str] = Field(
        default=None,
        description=(
            "Optional HuggingFace pipeline tag to filter by task type. "
            "Valid values: 'image-classification', 'text-classification', 'object-detection', "
            "'token-classification', 'question-answering', 'tabular-classification', "
            "'tabular-regression', 'audio-classification', 'automatic-speech-recognition', "
            "'sentence-similarity', 'text-generation', 'translation', 'summarization'"
        ),
    )


class HuggingFaceTool(BaseTool):
    name: str = "HuggingFaceModelSearch"
    description: str = (
        "Search HuggingFace Hub for pre-trained models matching a query. "
        "Returns up to 10 models sorted by downloads, with model ID, URL, task type, "
        "download count, and likes. Use specific queries and the pipeline_tag filter for best results."
    )
    args_schema: Type[BaseModel] = HuggingFaceSearchInput

    def _search(self, query: str, pipeline_tag: Optional[str], limit: int = HF_SEARCH_LIMIT) -> list:
        from huggingface_hub import list_models

        kwargs: dict = {"sort": "downloads", "limit": limit, "full": False, "cardData": False}
        if query:
            kwargs["search"] = query
        if pipeline_tag:
            kwargs["pipeline_tag"] = pipeline_tag

        results = []
        for model in list_models(**kwargs):
            model_id = getattr(model, "id", "") or ""
            if not model_id:
                continue
            results.append(
                {
                    "model_id": model_id,
                    "url": f"https://huggingface.co/{model_id}",
                    "task_type": getattr(model, "pipeline_tag", "") or "",
                    "downloads": int(getattr(model, "downloads", 0) or 0),
                    "likes": int(getattr(model, "likes", 0) or 0),
                    "tags": list(getattr(model, "tags", []) or [])[:6],
                }
            )
            if len(results) >= HF_RESULTS_CAP:
                break
        return results

    def _run(self, query: str, pipeline_tag: Optional[str] = None) -> str:
        try:
            results = self._search(query, pipeline_tag)

            if not results and query:
                short_query = " ".join(query.split()[:HF_SHORT_QUERY_WORDS])
                if short_query != query:
                    results = self._search(short_query, pipeline_tag)

            if not results and pipeline_tag:
                results = self._search("", pipeline_tag)

            return json.dumps({"query": query, "pipeline_tag": pipeline_tag, "results": results})

        except ImportError:
            return json.dumps(
                {
                    "error": "huggingface_hub package not installed. Run: pip install huggingface_hub",
                    "results": [],
                }
            )
        except Exception as exc:
            logger.warning("HuggingFace search failed for '%s': %s", query, exc)
            return json.dumps({"error": f"HuggingFace search failed: {exc}", "results": []})
