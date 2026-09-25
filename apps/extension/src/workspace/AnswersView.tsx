import { useState, useEffect } from "react";
import type { AnswerMemoryItem } from "@workit/domain";
import { workitApiClient } from "../runtime/api-client";
import { AlertBanner } from "./components/AlertBanner";


export function AnswersView() {
  const [answers, setAnswers] = useState<AnswerMemoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const fetchAnswers = async () => {
    setIsLoading(true);
    try {
      const res = await workitApiClient.listAnswers();
      setAnswers(res.answers);
    } catch (err) {
      console.error("[Workit] Failed to load answers:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnswers();
  }, []);

  const handleSaveAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    try {
      await workitApiClient.saveAnswer({
        questionText: newQuestion.trim(),
        answerText: newAnswer.trim(),
        category: newCategory.trim() || undefined,
      });

      setNewQuestion("");
      setNewAnswer("");
      setIsAdding(false);
      setSaveSuccessMsg("Answer saved successfully!");
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      await fetchAnswers();
    } catch (err) {
      console.error("[Workit] Failed to save answer:", err);
    }
  };

  const handleDeleteAnswer = async (id: string) => {
    try {
      await workitApiClient.deleteAnswer(id);
      await fetchAnswers();
    } catch (err) {
      console.error("[Workit] Failed to delete answer:", err);
    }
  };

  const filteredAnswers = answers.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      a.questionText.toLowerCase().includes(q) ||
      a.answerText.toLowerCase().includes(q) ||
      (a.category && a.category.toLowerCase().includes(q))
    );
  });

  return (
    <div className="profile-container" data-testid="answers-view">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, maxWidth: 540 }}>
          Store and manage reusable answers for employer questions. Workit will automatically suggest them during autofill.
        </p>
        <button
          type="button"
          className="btn-primary"
          style={{ width: "auto" }}
          data-testid="btn-add-answer"
          onClick={() => setIsAdding(!isAdding)}
        >
          {isAdding ? "Cancel" : "+ Add Answer"}
        </button>
      </div>

      <AlertBanner
        variant="success"
        message={saveSuccessMsg}
        data-testid="answer-save-success"
      />


      {isAdding && (
        <form
          onSubmit={handleSaveAnswer}
          className="profile-card"
          data-testid="add-answer-form"
        >
          <div className="form-group">
            <label className="form-label" htmlFor="input-new-question">
              Question / Prompt *
            </label>
            <input
              id="input-new-question"
              type="text"
              className="form-input"
              placeholder="e.g. Why do you want to work at our company?"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              required
              data-testid="input-new-question"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="input-new-answer">
              Answer Text *
            </label>
            <textarea
              id="input-new-answer"
              rows={4}
              className="form-input"
              placeholder="Write your reusable answer here..."
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              required
              data-testid="input-new-answer"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="input-new-category">
              Category
            </label>
            <input
              id="input-new-category"
              type="text"
              className="form-input"
              placeholder="motivation, leadership, technical..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              data-testid="input-new-category"
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsAdding(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              data-testid="btn-save-answer-submit"
            >
              Save Answer
            </button>
          </div>
        </form>
      )}

      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search answers by question or keywords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: 400 }}
          data-testid="input-search-answers"
        />
      </div>

      {isLoading ? (
        <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
          Loading answers...
        </div>
      ) : filteredAnswers.length === 0 ? (
        <div
          className="profile-card"
          style={{ textAlign: "center", padding: "24px" }}
          data-testid="answers-empty-state"
        >
          <p style={{ margin: 0, fontWeight: 500, color: "var(--text)" }}>No answers saved yet</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-faint)" }}>
            Add answers to common application questions to enable 1-click suggestions.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredAnswers.map((item) => (
            <div
              key={item.id}
              className="profile-card"
              style={{ marginBottom: 0, padding: "10px 14px" }}
              data-testid={`answer-card-${item.id}`}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <h3
                    style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: 0 }}
                    data-testid={`answer-question-${item.id}`}
                  >
                    {item.questionText}
                  </h3>
                  {item.category && (
                    <span
                      className="workit-chip"
                      style={{ fontSize: 10, marginTop: 2, padding: "1px 5px", display: "inline-block" }}
                    >
                      {item.category}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
                    Used {item.usageCount} {item.usageCount === 1 ? "time" : "times"}
                  </span>
                  <button
                    type="button"
                    className="action-btn"
                    style={{ color: "var(--danger)", padding: "2px 6px", fontSize: 11 }}
                    data-testid={`btn-delete-answer-${item.id}`}
                    onClick={() => handleDeleteAnswer(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text)",
                  margin: 0,
                  lineHeight: 1.4,
                  whiteSpace: "pre-wrap",
                }}
                data-testid={`answer-text-${item.id}`}
              >
                {item.answerText}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
