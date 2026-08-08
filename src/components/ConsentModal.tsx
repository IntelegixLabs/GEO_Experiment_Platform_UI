import { useState, type FormEvent } from "react";
import { Modal } from "./Modal";

const COUNTRIES = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo (Brazzaville)",
  "Congo (Democratic Republic)",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czechia",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Palestine",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Timor-Leste",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Vatican City",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
];

interface ConsentModalProps {
  open: boolean;
  studyName: string;
  isStarting: boolean;
  onClose: () => void;
  onStart: (details: {
    participantCode?: string;
    email?: string;
    age?: number;
    country?: string;
    aiFamiliarity?: string;
  }) => Promise<unknown>;
}

export function ConsentModal({ open, studyName, isStarting, onClose, onStart }: ConsentModalProps) {
  const [participantCode, setParticipantCode] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [country, setCountry] = useState("");
  const [aiFamiliarity, setAiFamiliarity] = useState("");
  const [consented, setConsented] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consented) {
      setError("Active consent is required to begin the study session.");
      return;
    }
    if (!participantCode.trim() || !email.trim() || !age.trim() || !country || !aiFamiliarity) {
      setError("Please complete all mandatory fields before starting the study session.");
      return;
    }
    setError("");
    const parsedAge = age.trim() ? parseInt(age, 10) : undefined;
    try {
      await onStart({
        participantCode: participantCode.trim() || undefined,
        email: email.trim() || undefined,
        age: !isNaN(parsedAge as number) ? parsedAge : undefined,
        country: country || undefined,
        aiFamiliarity: aiFamiliarity || undefined,
      });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The study session could not be started.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} titleId="consent-title">
      <button className="close-button" type="button" onClick={onClose} aria-label="Close consent information">×</button>
      <p className="eyebrow">Before you begin</p>
      <h2 id="consent-title">Study consent</h2>
      <p>
        You are invited to take part in <em>{studyName}</em>. You may stop at any time. This research interface records
        your participant name, email, age, location, search wording, product references, interactions, and questionnaire responses.
      </p>
      <p className="notice-copy">Do not enter payment, address, health, or other sensitive personal information.</p>
      <form onSubmit={submit} className="form-stack">
        <label>
          Participant Name
          <input
            required
            value={participantCode}
            onChange={(event) => setParticipantCode(event.target.value)}
            maxLength={120}
            autoComplete="name"
            placeholder="Enter your full name"
          />
        </label>
        <div className="form-row">
          <label>
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={160}
              autoComplete="email"
              placeholder="name@example.com"
            />
          </label>
          <label>
            Age
            <input
              required
              type="number"
              min={18}
              max={120}
              value={age}
              onChange={(event) => setAge(event.target.value)}
              placeholder="e.g. 25"
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Location
            <select
              required
              value={country}
              onChange={(event) => setCountry(event.target.value)}
            >
              <option value="">Select location…</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Experience with AI shopping tools
            <select
              required
              value={aiFamiliarity}
              onChange={(event) => setAiFamiliarity(event.target.value)}
            >
              <option value="">Select experience…</option>
              <option value="None">None</option>
              <option value="Rarely">Rarely</option>
              <option value="Sometimes">Sometimes</option>
              <option value="Often">Often</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </label>
        </div>
        <label className="checkbox-line">
          <input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} />
          <span>I am at least 18 years old, have read this information, and voluntarily consent to participate.</span>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button className="primary-button" type="submit" disabled={isStarting}>
            {isStarting ? "Starting…" : "I consent and want to start"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
