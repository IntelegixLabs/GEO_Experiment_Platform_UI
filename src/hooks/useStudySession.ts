import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { StudySession } from "../types";

const SESSION_STORAGE_KEY = "geo-shopping-lab-session";

function storedSession(): StudySession | null {
  try {
    const value = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as StudySession;
    return parsed.session_id && parsed.participant_code ? parsed : null;
  } catch {
    return null;
  }
}

export function useStudySession() {
  const [session, setSession] = useState<StudySession | null>(storedSession);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (session) {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [session]);

  const startSession = useCallback(async (details: {
    participantCode?: string;
    email?: string;
    age?: number;
    country?: string;
    aiFamiliarity?: string;
  }) => {
    setIsStarting(true);
    try {
      const next = await api.createSession({
        consent: true,
        participant_code: details.participantCode,
        email: details.email,
        age: details.age,
        country: details.country,
        ai_familiarity: details.aiFamiliarity,
      });
      setSession(next);
      return next;
    } finally {
      setIsStarting(false);
    }
  }, []);

  return { session, isStarting, startSession };
}
