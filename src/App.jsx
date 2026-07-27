import { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabaseClient';
import AuthPage from './pages/AuthPage';
import SetupPage from './pages/SetupPage';
import DashboardPage from './pages/DashboardPage';
import ThemeToggle from './components/ThemeToggle';

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('nofx_theme') || 'dark');
  const [session, setSession] = useState(undefined); // undefined = not checked yet, null = logged out
  const [setup, setSetup] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nofx_theme', theme);
  }, [theme]);

  const loadProfile = useCallback(async (userId) => {
    setProfileLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('setup')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Failed to load profile:', error.message);
      setSetup(null);
    } else {
      setSetup(data?.setup && Object.keys(data.setup).length ? data.setup : null);
    }
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setSession(session);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setSetup(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const handleSetup = async (setupData) => {
    setSetup(setupData);
    if (!session?.user) return;
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: session.user.id, setup: setupData }, { onConflict: 'id' });
    if (error) console.error('Failed to save setup:', error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSetup(null);
  };

  const user = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Trader',
      }
    : null;

  const checkingSession = session === undefined;
  const showLoading = checkingSession || (session?.user && profileLoading && setup === null);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <ThemeToggle theme={theme} setTheme={setTheme} />

      {showLoading && (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-secondary)', fontSize: '0.95rem',
        }}>
          Loading…
        </div>
      )}

      {!showLoading && !user && <AuthPage />}
      {!showLoading && user && !setup && <SetupPage onSetup={handleSetup} user={user} />}
      {!showLoading && user && setup && (
        <DashboardPage user={user} setup={setup} onLogout={handleLogout} onSetup={handleSetup} />
      )}
    </div>
  );
}

export default App;
