import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.getProfile()
        .then(data => setStudent(data))
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('student');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (registerNumber) => {
    const data = await api.login({ register_number: registerNumber });
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('student', JSON.stringify(data.student));
    setStudent(data.student);
    return data.student;
  };

  // Heartbeat polling
  useEffect(() => {
    let intervalId;
    if (student && !student.disqualified) {
      intervalId = setInterval(() => {
        api.heartbeat().catch(err => console.error("Heartbeat failed", err));
      }, 30000); // 30 seconds
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [student]);

  const register = async ({ register_number, name, department, year }) => {
    const data = await api.register({ register_number, name, department, year });
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('student', JSON.stringify(data.student));
    setStudent(data.student);
    return data.student;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('student');
    setStudent(null);
  };

  const refreshProfile = async () => {
    try {
      const data = await api.getProfile();
      setStudent(data);
      localStorage.setItem('student', JSON.stringify(data));
      return data;
    } catch {
      return student;
    }
  };

  const updateStudent = (data) => {
    setStudent(data);
    localStorage.setItem('student', JSON.stringify(data));
  };

  return (
    <AuthContext.Provider value={{ student, loading, login, register, logout, refreshProfile, updateStudent }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
