'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { User, Mail, Calendar, Info, Camera, Loader2, Save, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [about, setAbout] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setDob(profile.dob || '');
      setAbout(profile.about_description || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setMessage(null);

    const updates = {
      full_name: fullName,
      dob: dob || null,
      about_description: about || null,
      avatar_url: avatarUrl || null,
    };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      await refreshProfile();
    }
    setLoading(false);
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setMessage(null);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}-${Math.random()}.${fileExt}`;

      // Assuming there's a public bucket named 'avatars'
      // If it doesn't exist, this might fail, so we might fallback to Base64 or external links
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        // Fallback to base64 if bucket doesn't exist or RLS blocks
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          setAvatarUrl(reader.result as string);
          setUploading(false);
        };
        reader.onerror = () => {
          throw uploadError;
        };
        return;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error uploading image' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-16">
        
        <div className="pb-4 border-b border-slate-200/60 dark:border-zinc-900/80">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Profile Settings</h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-semibold">
            Manage your personal information, avatar, and preferences.
          </p>
        </div>

        {message && (
          <div className={`px-4 py-3 rounded-xl flex items-start gap-3 text-sm font-medium ${
            message.type === 'error' 
              ? 'bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-400'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400'
          }`}>
            {message.type === 'error' ? <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />}
            <p>{message.text}</p>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-3xl p-6 md:p-8 shadow-sm">
          <form onSubmit={handleSave} className="space-y-8">
            
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-slate-100 dark:border-zinc-900">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-800 overflow-hidden flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-slate-400 dark:text-zinc-500" />
                  )}
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity duration-200">
                  {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={uploadAvatar}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </label>
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">Profile Photo</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-xs">
                  We recommend a square image at least 256x256 pixels. Click the avatar to upload.
                </p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* User ID (Read-only) */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">User ID</label>
                <div className="relative">
                  <Info className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-zinc-600" />
                  <input
                    type="text"
                    readOnly
                    value={user?.id || ''}
                    className="w-full text-xs font-semibold bg-slate-100 dark:bg-zinc-900/80 text-slate-500 dark:text-zinc-500 border border-slate-200 dark:border-zinc-900 rounded-xl pl-10 pr-4 py-3 cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-semibold">Your unique system identifier. Cannot be changed.</p>
              </div>

              {/* Email (Read-only for now) */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-zinc-600" />
                  <input
                    type="email"
                    readOnly
                    value={user?.email || ''}
                    className="w-full text-xs font-semibold bg-slate-100 dark:bg-zinc-900/80 text-slate-500 dark:text-zinc-500 border border-slate-200 dark:border-zinc-900 rounded-xl pl-10 pr-4 py-3 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-zinc-600" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full text-xs font-semibold bg-slate-50/50 dark:bg-zinc-900/40 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-900 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-800 dark:focus:border-zinc-700 transition-all duration-300"
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Date of Birth</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-zinc-600" />
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full text-xs font-semibold bg-slate-50/50 dark:bg-zinc-900/40 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-900 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-800 dark:focus:border-zinc-700 transition-all duration-300"
                  />
                </div>
              </div>
            </div>

            {/* About Description */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">About You</label>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Tell us a little bit about yourself, your role, and what you build..."
                rows={4}
                className="w-full text-xs font-semibold bg-slate-50/50 dark:bg-zinc-900/40 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-900 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-800 dark:focus:border-zinc-700 transition-all duration-300 resize-none leading-relaxed"
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-zinc-900">
              <button
                type="submit"
                disabled={loading}
                className="group flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-black text-sm font-bold py-3 px-8 rounded-xl disabled:opacity-50 active:scale-[0.99] transition-all duration-200"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Changes</span>
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
