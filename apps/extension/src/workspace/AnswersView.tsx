import { useState, useEffect } from "react";
import type { AnswerMemoryItem } from "@workit/domain";
import { workitApiClient } from "../runtime/api-client";

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
    <div className="workspace-profile-container" data-testid="answers-view">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Answer Memory</h2>
          <p style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
            Store and manage reusable answers for employer questions. Workit will automatically suggest them during autofill.
          </p>
        </div>
        <button
          type="button"
          className="workit-primary-btn"
          style={{ width: "auto", padding: "8px 16px" }}
          data-testid="btn-add-answer"
          onClick={() => setIsAdding(!isAdding)}
        >
          {isAdding ? "Cancel" : "+ Add Answer"}
        </button>
      </div>

      {saveSuccessMsg && (
        <div
          style={{
            background: "#E8F5E9",
            color: "#2E7D32",
            padding: "8px 12px",
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 500,
          }}
          data-testid="answer-save-success"
        >
          {saveSuccessMsg}
        </div>
      )}

      {isAdding && (
        <form
          onSubmit={handleSaveAnswer}
          style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
          }}
          data-testid="add-answer-form"
        >
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Question / Prompt *
            </label>
            <input
              type="text"
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid #ccc",
                borderRadius: 6,
                fontSize: 13,
              }}
              placeholder="e.g. Why do you want to work at our company?"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              required
              data-testid="input-new-question"
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Answer Text *
            </label>
            <textarea
              rows={4}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid #ccc",
                borderRadius: 6,
                fontSize: 13,
                fontFamily: "inherit",
              }}
              placeholder="Write your reusable answer here..."
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              required
              data-testid="input-new-answer"
            />
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Category
              </label>
              <input
                type="text"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #ccc",
                  borderRadius: 6,
                  fontSize: 13,
                }}
                placeholder="motivation, leadership, technical..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                data-testid="input-new-category"
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              className="action-btn"
              onClick={() => setIsAdding(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="workit-primary-btn"
              style={{ width: "auto", padding: "8px 16px" }}
              data-testid="btn-save-answer-submit"
            >
              Save Answer
            </button>
          </div>
        </form>
      )}

      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search answers by question or keywords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            maxWidth: 400,
            padding: "8px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            fontSize: 13,
          }}
          data-testid="input-search-answers"
        />
      </div>

      {isLoading ? (
        <div style={{ padding: 32, textAlign: "center", color: "#666" }}>
          Loading answers...
        </div>
      ) : filteredAnswers.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            background: "#fff",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
          }}
          data-testid="answers-empty-state"
        >
          <p style={{ margin: 0, fontWeight: 500, color: "#444" }}>No answers saved yet</p>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#888" }}>
            Add answers to common application questions to enable 1-click suggestions.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredAnswers.map((item) => (
            <div
              key={item.id}
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 16,
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
              }}
              data-testid={`answer-card-${item.id}`}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <h3
                    style={{ fontSize: 14, fontWeight: 600, color: "#111", margin: 0 }}
                    data-testid={`answer-question-${item.id}`}
                  >
                    {item.questionText}
                  </h3>
                  {item.category && (
                    <span
                      className="workit-chip"
                      style={{ fontSize: 11, marginTop: 4, display: "inline-block" }}
                    >
                      {item.category}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "#888" }}>
                    Used {item.usageCount} {item.usageCount === 1 ? "time" : "times"}
                  </span>
                  <button
                    type="button"
                    className="action-btn"
                    style={{ color: "#DC2626", padding: "4px 8px", fontSize: 12 }}
                    data-testid={`btn-delete-answer-${item.id}`}
                    onClick={() => handleDeleteAnswer(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "#4b5563",
                  margin: 0,
                  lineHeight: 1.5,
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
