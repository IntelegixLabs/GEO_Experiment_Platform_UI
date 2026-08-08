import { useState, type FormEvent } from "react";
import { Modal } from "./Modal";

const questionnaire = [
  ["rq1", "The shopping assistant's recommendations were relevant to my needs."],
  ["rq2", "The recommendations gave enough detail to evaluate products."],
  ["rq3", "The recommendations appeared accurate based on the product information."],
  ["sc1", "The linked product references made the recommendation easier to verify."],
  ["sc2", "I considered the product references credible."],
  ["sc3", "The source information increased my confidence in the recommendation."],
  ["tr1", "I felt able to rely on the shopping assistant for product discovery."],
  ["tr2", "I trusted the assistant to present product information fairly."],
  ["tr3", "I would trust this type of assistant for a future product search."],
  ["pu1", "The assistant saved me effort in searching for products."],
  ["pu2", "The assistant made product comparison easier."],
  ["pu3", "Using the assistant was useful for making a shopping decision."],
  ["pr1", "I was concerned that the recommendation could be inaccurate or outdated."],
  ["pr2", "I was concerned that the assistant could overlook an important product detail."],
  ["pr3", "I felt there was some risk in relying on the recommendation alone."],
  ["pi1", "I would consider selecting a product recommended by this assistant."],
  ["pi2", "I would be willing to learn more about a recommended product."],
  ["pi3", "The assistant could influence my eventual purchase decision."],
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
      <p>For each statement, select 1 (strongly disagree) to 7 (strongly agree). You may leave an item blank.</p>
      <div className="scale-legend"><span>1 Strongly disagree</span><span>7 Strongly agree</span></div>
      <form onSubmit={submit}>
        <div className="survey-questions">
          {questionnaire.map(([name, question], index) => (
            <fieldset className="survey-item" key={name}>
              <legend>{index + 1}. {question}</legend>
              <div className="scale-options">
                {[1, 2, 3, 4, 5, 6, 7].map((value) => (
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
