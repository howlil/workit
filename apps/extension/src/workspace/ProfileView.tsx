import { useState, useEffect } from "react";
import type { FullCareerProfile, ResumeDraftProfile } from "@workit/contracts";
import { workitApiClient } from "../runtime/api-client";

export function ProfileView() {
  const [profileData, setProfileData] = useState<FullCareerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Resume Import State
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("resume.txt");
  const [resumeDraft, setResumeDraft] = useState<ResumeDraftProfile | null>(null);
  const [resumeArtifactId, setResumeArtifactId] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [importStatusMsg, setImportStatusMsg] = useState<string | null>(null);

  // Identity Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");

  const [githubUrl, setGithubUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [identitySaved, setIdentitySaved] = useState(false);

  // Experience Subform State
  const [expCompany, setExpCompany] = useState("");
  const [expTitle, setExpTitle] = useState("");
  const [expLocation, setExpLocation] = useState("");
  const [expStart, setExpStart] = useState("");
  const [expEnd, setExpEnd] = useState("");
  const [expCurrent, setExpCurrent] = useState(false);
  const [expFacts, setExpFacts] = useState("");

  // Education Subform State
  const [eduInstitution, setEduInstitution] = useState("");
  const [eduDegree, setEduDegree] = useState("");
  const [eduField, setEduField] = useState("");
  const [eduStart, setEduStart] = useState("");
  const [eduEnd, setEduEnd] = useState("");

  // Skills State
  const [skillTags, setSkillTags] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [skillsSaved, setSkillsSaved] = useState(false);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const data = await workitApiClient.getProfile();
      setProfileData(data);
      setFullName(data.profile.fullName || "");
      setEmail(data.profile.email || "");
      setPhone(data.profile.phone || "");
      setLocation(data.profile.location || "");
      setLinkedinUrl(data.profile.linkedinUrl || "");
      setPortfolioUrl(data.profile.portfolioUrl || "");
      setGithubUrl(data.profile.githubUrl || "");
      setSummary(data.profile.summary || "");
      setSkillTags(data.skills.map((s) => s.name));
    } catch (err) {
      console.error("[Workit] Failed to load profile:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        setResumeText(text);
      }
    };
    reader.readAsText(file);
  };

  const handleParseResume = async () => {
    if (!resumeText.trim()) return;
    setIsParsing(true);
    setImportStatusMsg(null);
    try {
      const res = await workitApiClient.parseResumeText(
        resumeFileName || "resume.txt",
        resumeText.trim()
      );
      setResumeDraft(res.draft);
      setResumeArtifactId(res.artifactId);
    } catch (err) {
      console.error("[Workit] Failed to parse resume:", err);
      setImportStatusMsg("Failed to parse resume text.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmResumeDraft = async () => {
    if (!resumeDraft) return;
    setIsConfirming(true);
    try {
      const res = await workitApiClient.confirmResumeDraft(
        resumeDraft,
        resumeArtifactId || undefined
      );
      setProfileData(res.profile);
      setFullName(res.profile.profile.fullName || "");
      setEmail(res.profile.profile.email || "");
      setPhone(res.profile.profile.phone || "");
      setLocation(res.profile.profile.location || "");
      setLinkedinUrl(res.profile.profile.linkedinUrl || "");
      setPortfolioUrl(res.profile.profile.portfolioUrl || "");
      setGithubUrl(res.profile.profile.githubUrl || "");
      setSummary(res.profile.profile.summary || "");
      setSkillTags(res.profile.skills.map((s) => s.name));

      setResumeDraft(null);
      setResumeText("");
      setImportStatusMsg("Profile successfully populated from resume! ✓");
      setTimeout(() => setImportStatusMsg(null), 4000);
    } catch (err) {
      console.error("[Workit] Failed to confirm resume draft:", err);
      setImportStatusMsg("Failed to update profile from draft.");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleSaveIdentity = async (e: React.FormEvent) => {

    e.preventDefault();
    try {
      const updated = await workitApiClient.updateProfileIdentity({
        fullName,
        email,
        phone,
        location,
        linkedinUrl,
        portfolioUrl,
        githubUrl,
        summary,
      });
      if (profileData) {
        setProfileData({ ...profileData, profile: updated });
      }
      setIdentitySaved(true);
      setTimeout(() => setIdentitySaved(false), 3000);
    } catch (err) {
      console.error("[Workit] Failed to save identity:", err);
    }
  };

  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expCompany.trim() || !expTitle.trim() || !expStart.trim()) return;

    const facts = expFacts
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    try {
      const newExp = await workitApiClient.addExperience({
        company: expCompany.trim(),
        title: expTitle.trim(),
        location: expLocation.trim() || undefined,
        startDate: expStart.trim(),
        endDate: expCurrent ? undefined : expEnd.trim() || undefined,
        isCurrent: expCurrent,
        facts,
      });

      if (profileData) {
        setProfileData({
          ...profileData,
          experiences: [newExp, ...profileData.experiences],
        });
      }

      setExpCompany("");
      setExpTitle("");
      setExpLocation("");
      setExpStart("");
      setExpEnd("");
      setExpCurrent(false);
      setExpFacts("");
    } catch (err) {
      console.error("[Workit] Failed to add experience:", err);
    }
  };

  const handleDeleteExperience = async (id: string) => {
    try {
      await workitApiClient.deleteExperience(id);
      if (profileData) {
        setProfileData({
          ...profileData,
          experiences: profileData.experiences.filter((e) => e.id !== id),
        });
      }
    } catch (err) {
      console.error("[Workit] Failed to delete experience:", err);
    }
  };

  const handleAddEducation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eduInstitution.trim()) return;

    try {
      const newEdu = await workitApiClient.addEducation({
        institution: eduInstitution.trim(),
        degree: eduDegree.trim() || undefined,
        fieldOfStudy: eduField.trim() || undefined,
        startDate: eduStart.trim() || undefined,
        endDate: eduEnd.trim() || undefined,
      });

      if (profileData) {
        setProfileData({
          ...profileData,
          education: [newEdu, ...profileData.education],
        });
      }

      setEduInstitution("");
      setEduDegree("");
      setEduField("");
      setEduStart("");
      setEduEnd("");
    } catch (err) {
      console.error("[Workit] Failed to add education:", err);
    }
  };

  const handleDeleteEducation = async (id: string) => {
    try {
      await workitApiClient.deleteEducation(id);
      if (profileData) {
        setProfileData({
          ...profileData,
          education: profileData.education.filter((e) => e.id !== id),
        });
      }
    } catch (err) {
      console.error("[Workit] Failed to delete education:", err);
    }
  };

  const handleAddSkillTag = () => {
    const trimmed = newSkill.trim();
    if (!trimmed) return;
    if (!skillTags.includes(trimmed)) {
      setSkillTags([...skillTags, trimmed]);
    }
    setNewSkill("");
  };

  const handleRemoveSkillTag = (skillName: string) => {
    setSkillTags(skillTags.filter((s) => s !== skillName));
  };

  const handleSaveSkills = async () => {
    try {
      const updated = await workitApiClient.setSkills(skillTags);
      if (profileData) {
        setProfileData({ ...profileData, skills: updated });
      }
      setSkillsSaved(true);
      setTimeout(() => setSkillsSaved(false), 3000);
    } catch (err) {
      console.error("[Workit] Failed to save skills:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="profile-container" data-testid="profile-loading">
        <div className="empty-state-view">Loading career profile...</div>
      </div>
    );
  }

  return (
    <div className="profile-container" data-testid="profile-view">
      {/* 0. Resume Import Card */}
      <section className="profile-card" data-testid="profile-resume-import-section">
        <div className="profile-card-header">
          <div>
            <h2 className="profile-card-title">Import Resume</h2>
            <p className="profile-card-desc">
              Upload a resume or paste text to extract candidate data into a reviewable draft
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
          <div>
            <label className="form-label" htmlFor="input-resume-file">Upload Resume File (.txt, .md)</label>
            <input
              id="input-resume-file"
              data-testid="input-resume-file"
              type="file"
              accept=".txt,.md,.text"
              onChange={handleFileChange}
              style={{ fontSize: "12px", color: "var(--text-muted)" }}
            />
          </div>

          <div>
            <label className="form-label" htmlFor="textarea-resume-text">Or Paste Resume Content</label>
            <textarea
              id="textarea-resume-text"
              data-testid="textarea-resume-text"
              className="form-input"
              rows={3}
              placeholder="Paste raw resume text here..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              className="btn-primary"
              data-testid="btn-parse-resume"
              disabled={!resumeText.trim() || isParsing}
              onClick={handleParseResume}
            >
              {isParsing ? "Parsing..." : "Parse Resume"}
            </button>
            {importStatusMsg && (
              <span className="save-status-msg" data-testid="resume-import-status">
                {importStatusMsg}
              </span>
            )}
          </div>
        </div>

        {/* Parsed Draft Review Box */}
        {resumeDraft && (
          <div
            data-testid="resume-draft-review"
            style={{
              padding: "10px 14px",
              background: "var(--hover)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-control)",
              marginTop: "10px",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>
              Review Parsed Draft (Proposal)
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "10px" }}>
              Workit extracted the following structured data. Please verify before applying to your profile.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "12px", marginBottom: "10px" }}>
              <div><strong>Name:</strong> {resumeDraft.identity.fullName || "(none detected)"}</div>
              <div><strong>Email:</strong> {resumeDraft.identity.email || "(none detected)"}</div>
              <div><strong>Phone:</strong> {resumeDraft.identity.phone || "(none detected)"}</div>
              <div><strong>Location:</strong> {resumeDraft.identity.location || "(none detected)"}</div>
              <div><strong>Experiences:</strong> {resumeDraft.experiences.length} found</div>
              <div><strong>Education:</strong> {resumeDraft.education.length} found</div>
            </div>

            {resumeDraft.skills.length > 0 && (
              <div style={{ marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)" }}>Detected Skills:</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                  {resumeDraft.skills.map((s) => (
                    <span key={s} className="skill-chip" style={{ fontSize: "12px" }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
              <button
                type="button"
                className="btn-primary"
                data-testid="btn-confirm-resume-draft"
                disabled={isConfirming}
                onClick={handleConfirmResumeDraft}
              >
                {isConfirming ? "Populating..." : "Confirm & Populate Profile"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                data-testid="btn-discard-resume-draft"
                onClick={() => setResumeDraft(null)}
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 1. Identity Card */}
      <section className="profile-card" data-testid="profile-identity-section">
        <div className="profile-card-header">
          <div>
            <h2 className="profile-card-title">Personal Identity</h2>
            <p className="profile-card-desc">Authoritative contact information used for candidate details</p>
          </div>
        </div>


        <form onSubmit={handleSaveIdentity}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="input-fullname">Full Name *</label>
              <input
                id="input-fullname"
                data-testid="input-fullname"
                className="form-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="input-email">Email Address *</label>
              <input
                id="input-email"
                type="email"
                data-testid="input-email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="input-phone">Phone Number</label>
              <input
                id="input-phone"
                data-testid="input-phone"
                className="form-input"
                value={phone}
                placeholder="+1 555-0100"
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="input-location">Location / City</label>
              <input
                id="input-location"
                data-testid="input-location"
                className="form-input"
                value={location}
                placeholder="City, State / Country"
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="input-linkedin">LinkedIn URL</label>
              <input
                id="input-linkedin"
                data-testid="input-linkedin"
                className="form-input"
                value={linkedinUrl}
                placeholder="https://linkedin.com/in/..."
                onChange={(e) => setLinkedinUrl(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="input-portfolio">Portfolio / Website</label>
              <input
                id="input-portfolio"
                data-testid="input-portfolio"
                className="form-input"
                value={portfolioUrl}
                placeholder="https://..."
                onChange={(e) => setPortfolioUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="input-summary">Professional Summary / Bio</label>
            <textarea
              id="input-summary"
              data-testid="input-summary"
              className="form-textarea"
              value={summary}
              placeholder="Brief summary of your professional expertise..."
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary"
              data-testid="btn-save-identity"
            >
              Save Identity
            </button>
            {identitySaved && (
              <span className="save-status-msg" data-testid="identity-save-status">
                Identity saved ✓
              </span>
            )}
          </div>
        </form>
      </section>

      {/* 2. Experience Card */}
      <section className="profile-card" data-testid="profile-experience-section">
        <div className="profile-card-header">
          <div>
            <h2 className="profile-card-title">Work Experience & Facts</h2>
            <p className="profile-card-desc">Individual facts serve as verifiable evidence for job criteria matching</p>
          </div>
        </div>

        {/* Existing experiences list */}
        {profileData && profileData.experiences.length > 0 && (
          <div className="profile-items-list" data-testid="experience-list">
            {profileData.experiences.map((exp) => (
              <div key={exp.id} className="profile-item-card" data-testid={`experience-item-${exp.id}`}>
                <div className="profile-item-top">
                  <div>
                    <h3 className="profile-item-main-title">{exp.title}</h3>
                    <div className="profile-item-sub-title">{exp.company}</div>
                    <div className="profile-item-meta">
                      {exp.startDate} - {exp.isCurrent ? "Present" : exp.endDate || "Present"}
                      {exp.location ? ` • ${exp.location}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-danger-text"
                    data-testid={`btn-delete-experience-${exp.id}`}
                    onClick={() => handleDeleteExperience(exp.id)}
                  >
                    Delete
                  </button>
                </div>

                {exp.facts && exp.facts.length > 0 && (
                  <ul className="profile-item-facts" data-testid="experience-facts-list">
                    {exp.facts.map((fact) => (
                      <li key={fact.id} data-testid="experience-fact-item">{fact.factText}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add Experience Subform */}
        <form onSubmit={handleAddExperience} className="subform-box">
          <h4 className="subform-title">+ Add Work Experience</h4>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="input-exp-company">Company *</label>
              <input
                id="input-exp-company"
                data-testid="input-exp-company"
                className="form-input"
                value={expCompany}
                placeholder="Acme Corp"
                onChange={(e) => setExpCompany(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="input-exp-title">Job Title *</label>
              <input
                id="input-exp-title"
                data-testid="input-exp-title"
                className="form-input"
                value={expTitle}
                placeholder="Senior Software Engineer"
                onChange={(e) => setExpTitle(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="input-exp-location">Location</label>
              <input
                id="input-exp-location"
                data-testid="input-exp-location"
                className="form-input"
                value={expLocation}
                placeholder="Remote / New York, NY"
                onChange={(e) => setExpLocation(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="input-exp-start">Start Date *</label>
              <input
                id="input-exp-start"
                data-testid="input-exp-start"
                className="form-input"
                value={expStart}
                placeholder="2022-01"
                onChange={(e) => setExpStart(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="input-exp-end">End Date</label>
              <input
                id="input-exp-end"
                data-testid="input-exp-end"
                className="form-input"
                value={expEnd}
                placeholder="2024-05"
                disabled={expCurrent}
                onChange={(e) => setExpEnd(e.target.value)}
              />
              <label className="form-checkbox-row">
                <input
                  type="checkbox"
                  data-testid="input-exp-current"
                  checked={expCurrent}
                  onChange={(e) => setExpCurrent(e.target.checked)}
                />
                Currently work here
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="input-exp-facts">
              Experience Facts (one key achievement/metric per line)
            </label>
            <textarea
              id="input-exp-facts"
              data-testid="input-exp-facts"
              className="form-textarea"
              value={expFacts}
              placeholder="Built RBAC for three roles&#10;Scaled API to 10k requests/second&#10;Decreased page load by 40%"
              onChange={(e) => setExpFacts(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn-secondary"
            data-testid="btn-add-experience"
          >
            Add Experience
          </button>
        </form>
      </section>

      {/* 3. Education Card */}
      <section className="profile-card" data-testid="profile-education-section">
        <div className="profile-card-header">
          <div>
            <h2 className="profile-card-title">Education</h2>
            <p className="profile-card-desc">Academic background and degrees</p>
          </div>
        </div>

        {/* Existing education list */}
        {profileData && profileData.education.length > 0 && (
          <div className="profile-items-list" data-testid="education-list">
            {profileData.education.map((edu) => (
              <div key={edu.id} className="profile-item-card" data-testid={`education-item-${edu.id}`}>
                <div className="profile-item-top">
                  <div>
                    <h3 className="profile-item-main-title">{edu.institution}</h3>
                    <div className="profile-item-sub-title">
                      {edu.degree ? `${edu.degree} in ` : ""}{edu.fieldOfStudy || ""}
                    </div>
                    {(edu.startDate || edu.endDate) && (
                      <div className="profile-item-meta">
                        {edu.startDate || ""} - {edu.endDate || ""}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-danger-text"
                    data-testid={`btn-delete-edu-${edu.id}`}
                    onClick={() => handleDeleteEducation(edu.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Education Subform */}
        <form onSubmit={handleAddEducation} className="subform-box">
          <h4 className="subform-title">+ Add Education</h4>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="input-edu-institution">Institution *</label>
              <input
                id="input-edu-institution"
                data-testid="input-edu-institution"
                className="form-input"
                value={eduInstitution}
                placeholder="University of California, Berkeley"
                onChange={(e) => setEduInstitution(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="input-edu-degree">Degree</label>
              <input
                id="input-edu-degree"
                data-testid="input-edu-degree"
                className="form-input"
                value={eduDegree}
                placeholder="Bachelor of Science"
                onChange={(e) => setEduDegree(e.target.value)}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="input-edu-field">Field of Study</label>
              <input
                id="input-edu-field"
                data-testid="input-edu-field"
                className="form-input"
                value={eduField}
                placeholder="Computer Science"
                onChange={(e) => setEduField(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="input-edu-dates">Dates</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  id="input-edu-dates"
                  data-testid="input-edu-start"
                  className="form-input"
                  value={eduStart}
                  placeholder="2018"
                  onChange={(e) => setEduStart(e.target.value)}
                />
                <input
                  data-testid="input-edu-end"
                  className="form-input"
                  value={eduEnd}
                  placeholder="2022"
                  onChange={(e) => setEduEnd(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn-secondary"
            data-testid="btn-add-education"
          >
            Add Education
          </button>
        </form>
      </section>

      {/* 4. Skills Card */}
      <section className="profile-card" data-testid="profile-skills-section">
        <div className="profile-card-header">
          <div>
            <h2 className="profile-card-title">Skills & Proficiencies</h2>
            <p className="profile-card-desc">Canonical keywords mapped to job posting requirements</p>
          </div>
        </div>

        <div className="skills-tags-row" data-testid="skills-tags-row">
          {skillTags.map((skill) => (
            <span key={skill} className="skill-chip" data-testid={`skill-chip-${skill}`}>
              {skill}
              <button
                type="button"
                className="skill-remove-btn"
                data-testid={`btn-remove-skill-${skill}`}
                onClick={() => handleRemoveSkillTag(skill)}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <div style={{ display: "flex", gap: "8px", maxWidth: "400px", marginBottom: "16px" }}>
          <input
            data-testid="input-skill-entry"
            className="form-input"
            value={newSkill}
            placeholder="e.g. TypeScript, React, Docker..."
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddSkillTag();
              }
            }}
          />
          <button
            type="button"
            className="btn-secondary"
            data-testid="btn-add-skill-tag"
            onClick={handleAddSkillTag}
          >
            Add
          </button>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn-primary"
            data-testid="btn-save-skills"
            onClick={handleSaveSkills}
          >
            Save Skills
          </button>
          {skillsSaved && (
            <span className="save-status-msg" data-testid="skills-save-status">
              Skills saved ✓
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
