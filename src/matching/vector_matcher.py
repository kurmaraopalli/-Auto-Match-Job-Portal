import os
import json
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Resolve paths relative to this script's location so the script works
# regardless of the current working directory.
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))
DATA_DIR = os.path.join(PROJECT_ROOT, 'data')

def clean_text(text):
    if not text:
        return ""
    # Convert to lowercase and clean up non-alphanumeric chars
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s\.\-#+]', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()

def run_matcher():
    print("====================================================")
    print("        AI-DRIVEN VECTOR MATCHING ENGINE           ")
    print("====================================================")
    
    resume_path = os.path.join(DATA_DIR, "resume_profile.json")
    scraped_path = os.path.join(DATA_DIR, "scraped_jobs.json")
    output_path = os.path.join(DATA_DIR, "latest_jobs.json")

    if not os.path.exists(resume_path):
        print(f"[Matcher] Error: Resume file not found at '{resume_path}'")
        return
    if not os.path.exists(scraped_path):
        print(f"[Matcher] Error: Scraped jobs file not found at '{scraped_path}'")
        return

    # Load candidate profile
    with open(resume_path, "r", encoding="utf-8") as f:
        profile = json.load(f)

    # Load raw jobs
    with open(scraped_path, "r", encoding="utf-8") as f:
        jobs = json.load(f)

    print(f"[Matcher] Loaded resume for: {profile.get('name')} ({profile.get('title')})")
    print(f"[Matcher] Loaded {len(jobs)} raw job listings.")

    # Flatten skills for matching
    candidate_skills = []
    for category, skill_list in profile.get("skills", {}).items():
        candidate_skills.extend(skill_list)
    
    # Compile candidate profile text representation
    profile_text = f"{profile.get('title')} {profile.get('summary')} {' '.join(profile.get('target_roles', []))} {' '.join(candidate_skills)}"
    cleaned_profile = clean_text(profile_text)

    # Filtering parameters for senior roles
    junior_keywords = [
        r'\bjunior\b', r'\bintern\b', r'\bfresher\b', r'\btrainee\b', 
        r'\bentry-level\b', r'\bgraduate trainee\b', r'\bassociate developer\b'
    ]

    matched_jobs = []

    # Prepare corpus for TF-IDF (Candidate profile + all jobs)
    corpus = [cleaned_profile]
    job_texts = []
    
    for job in jobs:
        # Build text description of job
        job_text = f"{job['title']} {job['description']} {' '.join(job['skills_required'])} {job['domain']}"
        job_texts.append(clean_text(job_text))
        corpus.append(clean_text(job_text))

    # Vectorize using TF-IDF
    vectorizer = TfidfVectorizer(stop_words='english')
    tfidf_matrix = vectorizer.fit_transform(corpus)
    
    # Calculate cosine similarity of candidate (index 0) against all jobs
    similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])[0]

    for idx, job in enumerate(jobs):
        title = job["title"].lower()
        
        # 1. Semantic Exclusion Filter for Junior / Cross-functional roles
        is_junior = any(re.search(pattern, title) for pattern in junior_keywords)
        # Exclude if experience required is less than 5 years (since resume has 16+ years)
        is_low_experience = job.get("experience_required_years", 0) < 5
        
        if is_junior or (is_low_experience and "architect" in title):
            # Skip junior or low-experience architectural roles to preserve high executive fit
            continue

        # Get Cosine similarity
        cos_score = float(similarities[idx])
        
        # 2. Skill Overlap Calculation
        job_skills = [s.lower() for s in job.get("skills_required", [])]
        matched_skills = []
        missing_skills = []
        
        for skill in candidate_skills:
            skill_lower = skill.lower()
            # If skill is explicitly requested or found in description
            if skill_lower in job_skills or re.search(r'\b' + re.escape(skill_lower) + r'\b', job["description"].lower()):
                if skill not in matched_skills:
                    matched_skills.append(skill)
            else:
                # If requested in job_skills but not possessed by candidate
                if skill_lower in job_skills and skill not in missing_skills:
                    missing_skills.append(skill)
                    
        # Identify missing skills explicitly mentioned in job requirements
        explicit_missing = []
        for js in job.get("skills_required", []):
            if js.lower() not in [cs.lower() for cs in candidate_skills]:
                explicit_missing.append(js)

        # 3. Hybrid Score Combination
        # Cosine similarity tells us general context fit, and skill overlap gives precision fit
        skills_match_ratio = len(matched_skills) / max(len(job_skills), 1)
        
        # Weighted score: 50% Cosine Similarity, 50% Skills Match Ratio
        final_score = (cos_score * 0.5) + (skills_match_ratio * 0.5)
        # Convert to percentage and scale it realistically (e.g. 30% to 95%)
        percentage_score = min(max(int(final_score * 100), 20), 98)

        # Exclude very low match scores to maintain premium targeting
        if percentage_score < 40:
            continue

        # Category determination
        if percentage_score >= 75:
            match_category = "High Match"
        elif percentage_score >= 55:
            match_category = "Medium Match"
        else:
            match_category = "Low Match"

        # Construct matched job object
        matched_job = job.copy()
        matched_job["match_score"] = percentage_score
        matched_job["match_category"] = match_category
        matched_job["matched_skills"] = matched_skills
        matched_job["missing_skills"] = explicit_missing[:5] # limit to 5
        
        matched_jobs.append(matched_job)

    # Sort matched jobs by score in descending order
    matched_jobs.sort(key=lambda x: x["match_score"], reverse=True)

    # Save to data/latest_jobs.json
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(matched_jobs, f, indent=2, ensure_ascii=False)

    print(f"[Matcher] Successfully matched, filtered, and scored job listings.")
    print(f"[Matcher] Saved {len(matched_jobs)} processed listings to '{output_path}'")
    print(f"[Matcher] Total High Matches (>=75%): {len([j for j in matched_jobs if j['match_category'] == 'High Match'])}")
    print(f"[Matcher] Total Medium Matches (55-74%): {len([j for j in matched_jobs if j['match_category'] == 'Medium Match'])}")
    print(f"[Matcher] Total Low Matches (<55%): {len([j for j in matched_jobs if j['match_category'] == 'Low Match'])}")
    print("====================================================\n")

if __name__ == "__main__":
    run_matcher()
