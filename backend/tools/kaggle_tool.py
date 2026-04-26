import json
import logging
from typing import Type

from crewai.tools import BaseTool
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

KAGGLE_RESULTS_CAP = 10
KAGGLE_SHORT_QUERY_WORDS_3 = 3
KAGGLE_SHORT_QUERY_WORDS_2 = 2


class KaggleSearchInput(BaseModel):
    query: str = Field(
        description=(
            "Targeted search query combining domain, data type, and task. "
            "Example: 'plant disease leaf images classification'"
        )
    )


class KaggleTool(BaseTool):
    name: str = "KaggleDatasetSearch"
    description: str = (
        "Search Kaggle for public datasets matching a query. "
        "Returns up to 10 datasets with title, URL, description, vote count, and download count. "
        "Use specific queries combining the domain, data type, and ML task for best results."
    )
    args_schema: Type[BaseModel] = KaggleSearchInput

    def _search(self, api, query: str) -> list:
        datasets = api.dataset_list(search=query, sort_by="votes")
        results = []
        for ds in list(datasets)[:KAGGLE_RESULTS_CAP]:
            ref = getattr(ds, "ref", "") or ""
            if not ref:
                continue
            title = getattr(ds, "title", "") or ref
            subtitle = getattr(ds, "subtitle", "") or ""
            vote_count = int(getattr(ds, "voteCount", 0) or 0)
            download_count = int(getattr(ds, "downloadCount", 0) or 0)
            usability = float(getattr(ds, "usabilityRating", 0) or 0)
            results.append(
                {
                    "title": title,
                    "url": f"https://www.kaggle.com/datasets/{ref}",
                    "description": subtitle[:300] if subtitle else "No description available.",
                    "vote_count": vote_count,
                    "download_count": download_count,
                    "usability_rating": round(usability, 2),
                }
            )
        return results

    def _run(self, query: str) -> str:
        try:
            from kaggle.api.kaggle_api_extended import KaggleApi

            api = KaggleApi()
            api.authenticate()

            results = self._search(api, query)

            if not results and query:
                shorter = " ".join(query.split()[:KAGGLE_SHORT_QUERY_WORDS_3])
                if shorter != query:
                    logger.info("Kaggle: retrying with 3-word query '%s'", shorter)
                    results = self._search(api, shorter)

            if not results and query:
                shortest = " ".join(query.split()[:KAGGLE_SHORT_QUERY_WORDS_2])
                if shortest != query:
                    logger.info("Kaggle: retrying with 2-word query '%s'", shortest)
                    results = self._search(api, shortest)

            return json.dumps({"query": query, "results": results})

        except ImportError as exc:
            return json.dumps(
                {"error": f"Kaggle import error: {exc}. Run: pip install --upgrade kaggle", "results": []}
            )
        except SystemExit:
            return json.dumps(
                {
                    "error": (
                        "Kaggle authentication failed. "
                        "Set KAGGLE_USERNAME and KAGGLE_KEY environment variables "
                        "(get them from https://www.kaggle.com/settings → API → Create New Token)."
                    ),
                    "results": [],
                }
            )
        except Exception as exc:
            logger.warning("Kaggle search failed for '%s': %s", query, exc)
            return json.dumps(
                {
                    "error": (
                        f"Kaggle search failed: {exc}. "
                        "Ensure KAGGLE_USERNAME and KAGGLE_KEY are set in the environment."
                    ),
                    "results": [],
                }
            )
