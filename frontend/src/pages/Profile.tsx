/* ── Profile Page – Doodle Dash ── */

import { useState, useEffect, useCallback, useRef, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { ComicCard, GameBtn, Icon, Avatar } from '../components/ui';
import { toast } from 'sonner';
import type { GameHistoryEntry } from '../lib/types';

/* ── Location autocomplete result ── */
interface LocationResult {
  formatted: string;
  lat: number;
  lon: number;
  city: string | null;
  country: string | null;
}

export default function Profile() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const updateUser = useAuthStore(s => s.updateUser);

  /* ── Profile form state ── */
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  /* ── Avatar ── */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  /* ── Location ── */
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const locationTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  /* ── MFA ── */
  const [mfaStep, setMfaStep] = useState<'idle' | 'setup' | 'verify-enable' | 'verify-disable'>('idle');
  const [mfaQr, setMfaQr] = useState('');
  const [mfaManualKey, setMfaManualKey] = useState('');
  const [mfaOtp, setMfaOtp] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  /* ── Game History ── */
  const [games, setGames] = useState<GameHistoryEntry[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);

  // ── Seed form on load ──
  useEffect(() => {
    if (!user) return;
    setUsername(user.username ?? '');
    setFirstName(user.firstName ?? '');
    setLastName(user.lastName ?? '');
    setPhone(user.phone ?? '');
    if (user.location) {
      setLocationQuery(user.location.name || user.location.label || '');
    }
  }, [user]);

  // ── Load game history ──
  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<{ games: GameHistoryEntry[] }>('/profile/history');
        setGames(data.games);
      } catch {
        /* ignore */
      } finally {
        setLoadingGames(false);
      }
    })();
  }, []);

  // ── Save profile ──
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api.patch<{ user: Record<string, unknown> }>('/profile', {
        username: username.toLowerCase().trim(),
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        phone: phone.trim() || null,
      });
      updateUser(data.user as never);
      toast.success('Profile updated!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  // ── Avatar upload ──
  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const data = await api.upload<{ avatar: string }>('/profile/avatar', formData);
      updateUser({ avatar: data.avatar } as never);
      toast.success('Avatar updated!');
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await api.del('/profile/avatar');
      updateUser({ avatar: undefined } as never);
      toast.success('Avatar removed');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove');
    }
  };

  // ── Location autocomplete ──
  const searchLocation = useCallback(async (text: string) => {
    if (text.length < 2) { setLocationResults([]); return; }
    try {
      const data = await api.get<{ results: LocationResult[] }>(`/location/autocomplete?text=${encodeURIComponent(text)}`);
      setLocationResults(data.results);
      setShowLocationDropdown(true);
    } catch {
      setLocationResults([]);
    }
  }, []);

  const handleLocationInput = (val: string) => {
    setLocationQuery(val);
    clearTimeout(locationTimerRef.current);
    locationTimerRef.current = setTimeout(() => searchLocation(val), 400);
  };

  const pickLocation = async (loc: LocationResult) => {
    setLocationQuery(loc.formatted);
    setShowLocationDropdown(false);
    setSavingLocation(true);
    try {
      const data = await api.patch<{ user: Record<string, unknown> }>('/profile', {
        location: { lat: loc.lat, lon: loc.lon, name: loc.formatted },
      });
      updateUser(data.user as never);
      toast.success('Location saved!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save location');
    } finally {
      setSavingLocation(false);
    }
  };

  const clearLocation = async () => {
    setSavingLocation(true);
    try {
      const data = await api.patch<{ user: Record<string, unknown> }>('/profile', { location: null });
      updateUser(data.user as never);
      setLocationQuery('');
      toast.success('Location cleared');
    } catch (err: any) {
      toast.error(err?.message || 'Failed');
    } finally {
      setSavingLocation(false);
    }
  };

  // ── MFA ──
  const handleEnableMfa = async () => {
    setMfaLoading(true);
    try {
      const data = await api.post<{ qrCode: string; manualEntry: string }>('/mfa/enable');
      setMfaQr(data.qrCode);
      setMfaManualKey(data.manualEntry);
      setMfaStep('setup');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to start MFA setup');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyEnable = async () => {
    if (mfaOtp.length !== 6) return;
    setMfaLoading(true);
    try {
      await api.post('/mfa/verify-enable', { otp: mfaOtp });
      updateUser({ mfaEnabled: true });
      setMfaStep('idle');
      setMfaOtp('');
      toast.success('MFA enabled!');
    } catch (err: any) {
      toast.error(err?.message || 'Invalid code');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    if (mfaOtp.length !== 6) return;
    setMfaLoading(true);
    try {
      await api.post('/mfa/disable', { otp: mfaOtp });
      updateUser({ mfaEnabled: false });
      setMfaStep('idle');
      setMfaOtp('');
      toast.success('MFA disabled');
    } catch (err: any) {
      toast.error(err?.message || 'Invalid code');
    } finally {
      setMfaLoading(false);
    }
  };

  if (!user) return null;

  const winRate = user.gamesPlayed > 0 ? Math.round((user.gamesWon / user.gamesPlayed) * 100) : 0;

  /* ── Per-game config ── */
  const GAME_META: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
    doodle:     { label: 'Doodle Dash', color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200',  icon: 'brush' },
    hangman:    { label: 'Hangman',     color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-200',  icon: 'text_fields' },
    tictactoe:  { label: 'Tic Tac Toe', color: 'text-indigo-600', bg: 'bg-indigo-50',  border: 'border-indigo-200',  icon: 'grid_on' },
    fruitninja: { label: 'Fruit Ninja', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bolt' },
  };

  const GAME_BADGE: Record<string, { label: string; bg: string; text: string }> = {
    doodle:     { label: 'DOODLE',      bg: 'bg-purple-100',  text: 'text-purple-700' },
    hangman:    { label: 'HANGMAN',     bg: 'bg-orange-100',  text: 'text-orange-700' },
    tictactoe:  { label: 'TIC TAC TOE', bg: 'bg-indigo-100', text: 'text-indigo-700' },
    fruitninja: { label: 'FRUIT NINJA', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 max-w-6xl mx-auto">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/80 hover:text-white font-bold transition-colors">
          <Icon name="arrow_back" className="text-2xl" /> Back
        </button>
        <h1 className="font-display font-black text-3xl md:text-4xl text-white drop-shadow-lg">MY PROFILE</h1>
        <div className="w-20" />
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT: Avatar + Stats ── */}
        <div className="space-y-6">
          {/* Avatar Card */}
          <ComicCard className="p-6 text-center" borderColor="border-blue-400">
            <h3 className="font-display font-black text-lg text-blue-600 mb-4">YOUR AVATAR</h3>
            <div className="flex justify-center mb-4">
              <Avatar
                src={user.avatar}
                username={user.username}
                size={120}
                borderColor="border-blue-500"
                editable
                onClick={() => fileInputRef.current?.click()}
              />
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            {uploadingAvatar && <p className="text-sm text-blue-500 font-bold mb-2 animate-pulse">Uploading...</p>}
            <div className="flex gap-2 justify-center">
              <GameBtn variant="blue" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Icon name="upload" className="text-lg" /> Upload
              </GameBtn>
              {user.avatar && (
                <GameBtn variant="red" size="sm" onClick={handleRemoveAvatar}>
                  <Icon name="delete" className="text-lg" /> Remove
                </GameBtn>
              )}
            </div>
          </ComicCard>

          {/* Stats Card */}
          <ComicCard className="p-6" borderColor="border-yellow-400">
            <h3 className="font-display font-black text-lg text-yellow-600 mb-4 flex items-center gap-2">
              <Icon name="bar_chart" className="text-xl" /> GAME STATS
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Played', value: user.gamesPlayed, icon: 'sports_esports', color: 'text-purple-600' },
                { label: 'Won', value: user.gamesWon, icon: 'emoji_events', color: 'text-yellow-600' },
                { label: 'Win Rate', value: `${winRate}%`, icon: 'percent', color: 'text-green-600' },
                { label: 'Total Score', value: user.totalScore, icon: 'star', color: 'text-orange-600' },
              ].map(stat => (
                <div key={stat.label} className="bg-gray-50 rounded-xl p-3 border-2 border-gray-200 text-center">
                  <Icon name={stat.icon} filled className={`text-2xl ${stat.color} mb-1`} />
                  <div className={`font-display font-black text-xl ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs font-bold text-gray-500 uppercase">{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-purple-50 rounded-xl p-3 border-2 border-purple-200 flex items-center gap-3">
              <Icon name="monetization_on" filled className="text-3xl text-purple-600" />
              <div>
                <div className="font-display font-black text-xl text-purple-600">{user.credits}</div>
                <div className="text-xs font-bold text-purple-400 uppercase">Credits</div>
              </div>
            </div>

            {/* Per-game breakdown */}
            {user.perGameStats && (
              <div className="mt-4 space-y-2">
                <h4 className="text-xs font-bold text-gray-500 uppercase">Per Game</h4>
                {(['doodle', 'hangman', 'tictactoe', 'fruitninja'] as const).map(key => {
                  const meta = GAME_META[key];
                  const s = user.perGameStats![key];
                  const wr = s.played > 0 ? Math.round((s.won / s.played) * 100) : 0;
                  return (
                    <div key={key} className={`flex items-center gap-3 ${meta.bg} ${meta.border} border-2 rounded-xl p-2.5`}>
                      <Icon name={meta.icon} filled className={`text-xl ${meta.color}`} />
                      <span className={`font-bold text-sm ${meta.color} flex-1`}>{meta.label}</span>
                      <div className="flex gap-3 text-xs font-bold text-gray-500">
                        <span>{s.played} <span className="text-[10px] uppercase">P</span></span>
                        <span>{s.won} <span className="text-[10px] uppercase">W</span></span>
                        <span className={meta.color}>{wr}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ComicCard>
        </div>

        {/* ── CENTER: Profile Form + Location ── */}
        <div className="space-y-6">
          {/* Profile Form Card */}
          <ComicCard className="p-6" borderColor="border-green-400">
            <h3 className="font-display font-black text-lg text-green-600 mb-4 flex items-center gap-2">
              <Icon name="edit" className="text-xl" /> EDIT PROFILE
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Username</label>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase())}
                  className="w-full px-4 py-3 border-3 border-gray-300 rounded-xl font-bold text-slate-800 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                  placeholder="username"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">First Name</label>
                  <input
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 border-3 border-gray-300 rounded-xl font-bold text-slate-800 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                    placeholder="First"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Last Name</label>
                  <input
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full px-4 py-3 border-3 border-gray-300 rounded-xl font-bold text-slate-800 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                    placeholder="Last"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Phone</label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border-3 border-gray-300 rounded-xl font-bold text-slate-800 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                  placeholder="+91 9876543210"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Email</label>
                <input
                  value={user.email}
                  disabled
                  className="w-full px-4 py-3 border-3 border-gray-200 bg-gray-50 rounded-xl font-bold text-gray-400 cursor-not-allowed"
                />
              </div>
              <GameBtn variant="green" size="lg" fullWidth type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'SAVE CHANGES'}
              </GameBtn>
            </form>
          </ComicCard>

          {/* Location Card */}
          <ComicCard className="p-6" borderColor="border-cyan-400">
            <h3 className="font-display font-black text-lg text-cyan-600 mb-4 flex items-center gap-2">
              <Icon name="location_on" className="text-xl" /> LOCATION
            </h3>
            <div className="relative">
              <input
                value={locationQuery}
                onChange={e => handleLocationInput(e.target.value)}
                onFocus={() => locationResults.length > 0 && setShowLocationDropdown(true)}
                className="w-full px-4 py-3 border-3 border-gray-300 rounded-xl font-bold text-slate-800 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all pr-10"
                placeholder="Search city or address..."
              />
              {savingLocation && (
                <Icon name="sync" className="absolute right-3 top-1/2 -translate-y-1/2 text-xl text-cyan-500 animate-spin" />
              )}
              {showLocationDropdown && locationResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border-3 border-gray-300 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                  {locationResults.map((loc, i) => (
                    <button
                      key={i}
                      onClick={() => pickLocation(loc)}
                      className="w-full text-left px-4 py-3 hover:bg-cyan-50 border-b border-gray-100 last:border-b-0 font-bold text-sm text-slate-700 transition-colors"
                    >
                      <Icon name="location_on" className="text-cyan-500 mr-2 text-sm align-middle" />
                      {loc.formatted}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {user.location && (
              <div className="mt-3 flex items-center gap-2 bg-cyan-50 border-2 border-cyan-200 rounded-xl p-3">
                <Icon name="check_circle" filled className="text-cyan-600 text-xl" />
                <span className="text-sm font-bold text-cyan-700 flex-1 truncate">{user.location.name || user.location.label}</span>
                <button onClick={clearLocation} className="text-red-400 hover:text-red-600">
                  <Icon name="close" className="text-lg" />
                </button>
              </div>
            )}
          </ComicCard>
        </div>

        {/* ── RIGHT: MFA + Game History ── */}
        <div className="space-y-6">
          {/* MFA Card */}
          <ComicCard className="p-6" borderColor="border-pink-400">
            <h3 className="font-display font-black text-lg text-pink-600 mb-4 flex items-center gap-2">
              <Icon name="security" className="text-xl" /> TWO-FACTOR AUTH
            </h3>

            {mfaStep === 'idle' && (
              <>
                <div className={`flex items-center gap-3 p-3 rounded-xl border-2 mb-4 ${user.mfaEnabled ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                  <Icon name={user.mfaEnabled ? 'verified_user' : 'gpp_bad'} filled className={`text-2xl ${user.mfaEnabled ? 'text-green-600' : 'text-red-500'}`} />
                  <div>
                    <div className={`font-bold ${user.mfaEnabled ? 'text-green-700' : 'text-red-600'}`}>
                      {user.mfaEnabled ? 'MFA Enabled' : 'MFA Disabled'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {user.mfaEnabled ? 'Your account is extra secure' : 'Enable for extra security'}
                    </div>
                  </div>
                </div>
                {user.mfaEnabled ? (
                  <GameBtn variant="red" size="md" fullWidth onClick={() => setMfaStep('verify-disable')}>
                    <Icon name="lock_open" className="text-lg" /> DISABLE MFA
                  </GameBtn>
                ) : (
                  <GameBtn variant="green" size="md" fullWidth onClick={handleEnableMfa} disabled={mfaLoading}>
                    {mfaLoading ? 'Setting up...' : <><Icon name="lock" className="text-lg" /> ENABLE MFA</>}
                  </GameBtn>
                )}
              </>
            )}

            {mfaStep === 'setup' && (
              <div className="space-y-4">
                <p className="text-sm font-bold text-gray-600">Scan this QR code with your authenticator app:</p>
                <div className="flex justify-center">
                  <img src={mfaQr} alt="MFA QR Code" className="w-48 h-48 rounded-xl border-4 border-pink-200" />
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border-2 border-gray-200">
                  <p className="text-xs text-gray-500 font-bold mb-1">Manual entry key:</p>
                  <p className="font-mono text-xs text-slate-700 break-all select-all">{mfaManualKey}</p>
                </div>
                <GameBtn variant="purple" fullWidth onClick={() => setMfaStep('verify-enable')}>
                  NEXT: VERIFY CODE
                </GameBtn>
                <button onClick={() => setMfaStep('idle')} className="w-full text-center text-sm font-bold text-gray-400 hover:text-gray-600">Cancel</button>
              </div>
            )}

            {(mfaStep === 'verify-enable' || mfaStep === 'verify-disable') && (
              <div className="space-y-4">
                <p className="text-sm font-bold text-gray-600">
                  {mfaStep === 'verify-enable' ? 'Enter the 6-digit code from your app:' : 'Enter your authenticator code to disable MFA:'}
                </p>
                <input
                  value={mfaOtp}
                  onChange={e => setMfaOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="w-full px-4 py-3 text-center text-2xl font-display font-black tracking-[0.5em] border-3 border-pink-300 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-none"
                  placeholder="000000"
                />
                <GameBtn
                  variant={mfaStep === 'verify-enable' ? 'green' : 'red'}
                  fullWidth
                  onClick={mfaStep === 'verify-enable' ? handleVerifyEnable : handleDisableMfa}
                  disabled={mfaOtp.length !== 6 || mfaLoading}
                >
                  {mfaLoading ? 'Verifying...' : mfaStep === 'verify-enable' ? 'VERIFY & ENABLE' : 'VERIFY & DISABLE'}
                </GameBtn>
                <button onClick={() => { setMfaStep('idle'); setMfaOtp(''); }} className="w-full text-center text-sm font-bold text-gray-400 hover:text-gray-600">Cancel</button>
              </div>
            )}
          </ComicCard>

          {/* Game History */}
          <ComicCard className="p-6" borderColor="border-orange-400" rotate>
            <h3 className="font-display font-black text-lg text-orange-600 mb-4 flex items-center gap-2">
              <Icon name="history" className="text-xl" /> GAME HISTORY
            </h3>
            {loadingGames ? (
              <div className="text-center py-8">
                <Icon name="sync" className="text-3xl text-orange-400 animate-spin" />
              </div>
            ) : games.length === 0 ? (
              <p className="text-center text-gray-400 font-bold py-6">No games yet — go play!</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto scrollbar-hide">
                {games.map(game => {
                  const me = game.players.find(p => p.userId === user._id);
                  const isWinner = game.winner.userId === user._id;
                  const badge = GAME_BADGE[game.gameType ?? 'doodle'] ?? GAME_BADGE.doodle;
                  return (
                    <div key={game._id} className={`flex items-center p-3 rounded-xl border-2 ${isWinner ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-black text-lg ${isWinner ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-200 text-gray-500'}`}>
                        {me?.rank ?? '?'}
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="font-bold text-sm text-slate-800 truncate flex items-center gap-2">
                          {isWinner ? '🏆 Victory!' : `#${me?.rank ?? '?'} place`}
                          <span className={`${badge.bg} ${badge.text} text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none`}>{badge.label}</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(game.createdAt).toLocaleDateString()} · {game.players.length} players · {game.totalRounds} rounds
                        </div>
                      </div>
                      <div className="font-display font-black text-purple-600">{me?.score ?? 0}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </ComicCard>
        </div>
      </div>
    </div>
  );
}
