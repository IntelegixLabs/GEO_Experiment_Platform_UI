import { useState, type FormEvent } from "react";
import { Modal } from "./Modal";

const questionnaire = [
  ["rq1", "The AI recommendations were accurate."],
  ["rq2", "The recommended products fitted my requirements."],
  ["rq3", "The recommendations were helpful for my product decision."],
  ["rq4", "Overall, the AI provided high-quality recommendations."],
  ["ra1", "The recommended product matched my requirements."],
  ["ra2", "The recommendation was relevant to what I was looking for."],
  ["ra3", "The recommended product suited my preferences."],
  ["pu1", "The AI recommendation was useful for selecting a product."],
  ["pu2", "The recommendation helped me make a better product decision."],
  ["pu3", "The AI made product selection more effective."],
  ["pu4", "Overall, the AI recommendation was useful to me."],
  ["tr1", "I consider the AI recommendation reliable."],
  ["tr2", "I trust the AI to recommend suitable products."],
  ["tr3", "I feel confident relying on this recommendation."],
  ["tr4", "I believe the AI acts in my interest when making recommendations."],
  ["ds1", "I am satisfied with the product decision I was able to make."],
  ["ds2", "The AI made the product-selection process satisfactory."],
  ["ds3", "I am satisfied with the outcome of the recommendation process."],
  ["rs1", "I am satisfied with the AI recommendation."],
  ["rs2", "The recommendation experience met my expectations."],
  ["rs3", "Overall, I am satisfied with the AI recommendation."],
  ["pi1", "I would consider purchasing the recommended product."],
  ["pi2", "I am likely to purchase the recommended product."],
  ["pi3", "I would be willing to buy the recommended product."],
  ["ri1", "I would use an AI recommender again for a future product purchase."],
  ["ri2", "I would consider using this AI recommendation service again."],
  ["ri3", "I would rely on AI recommendations in future shopping decisions."],
] as const;

interface SurveyModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (answers: Record<string, string>) => Promise<void>;
}

export function SurveyModal({ open, onClose, onSubmit }: SurveyModalProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (Object.keys(answers).length === 0) {
      setError("Please answer at least one statement before submitting.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit(answers);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The questionnaire could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} titleId="survey-title" className="survey-modal">
      <button className="close-button" type="button" onClick={onClose} aria-label="Close questionnaire">×</button>
      <p className="eyebrow">Short questionnaire</p>
      <h2 id="survey-title">Your shopping-assistant experience</h2>
      <p>For each statement, select 1 (strongly disagree) to 5 (strongly agree). You may leave an item blank.</p>
      <div className="scale-legend"><span>1 Strongly disagree</span><span>5 Strongly agree</span></div>
      <form onSubmit={submit}>
        <div className="survey-questions">
          {questionnaire.map(([name, question], index) => (
            <fieldset className="survey-item" key={name}>
              <legend>{index + 1}. {question}</legend>
              <div className="scale-options">
                {[1, 2, 3, 4, 5].map((value) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name={name}
                      value={value}
                      checked={answers[name] === String(value)}
                      onChange={() => setAnswers((previous) => ({ ...previous, [name]: String(value) }))}
                    />
                    <span>{value}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions"><button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving…" : "Submit questionnaire"}</button></div>
      </form>
    </Modal>
  );
}
