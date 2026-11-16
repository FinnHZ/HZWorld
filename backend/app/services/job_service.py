def analyze_job(job, cv_text=""):
    """
    Provider-neutral placeholder. Replace with a real AI provider integration.
    Never send CV data to an external provider without user consent.
    """
    return {
        "job_title": job.get("title", ""),
        "company": job.get("company", ""),
        "status": "not_configured",
        "summary": "AI analysis provider has not been configured yet.",
        "matching_highlights": [],
        "suggestions": ["Configure an AI provider and a consent/data-retention policy."]
    }
