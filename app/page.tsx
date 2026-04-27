'use client';

import { useState, useRef, useCallback } from 'react';

interface VideoResult {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  views: string;
  duration: string;
  published: string;
  description: string;
  vsScore: number;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice search is not supported in your browser. Please use Chrome.');
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-GB';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setIsListening(true);
    recognition.start();
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setIsListening(false);
      handleSearch(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      setIsSearching(true);
      setHasSearched(true);
      try {
        const res = await fetch('/api/vision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        });
        const data = await res.json();
        if (data.query) {
          setQuery(data.query);
          handleSearch(data.query);
        }
      } catch {
        setIsSearching(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  }, []);

  const handleAnalyseUrl = () => {
    if (!urlInput.trim()) return;
    const videoId = urlInput.match(/(?:v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
    if (videoId) {
      window.location.href = `/analyse?v=${videoId}`;
    } else {
      alert('Please enter a valid YouTube URL');
    }
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="32" height="32" viewBox="0 0 70 70" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6C63FF"/>
                <stop offset="100%" stopColor="#00D4FF"/>
              </linearGradient>
            </defs>
            <path d="M5,35 Q25,8 50,35 Q25,62 5,35Z" fill="none" stroke="#6C63FF" strokeWidth="2.5" opacity="0.28"/>
            <path d="M15,35 Q35,10 60,35 Q35,60 15,35Z" fill="none" stroke="url(#hg)" strokeWidth="2.8"/>
            <circle cx="37" cy="35" r="10" fill="url(#hg)"/>
            <circle cx="37" cy="35" r="4.5" fill="white"/>
            <path d="M50,26 L60,26 L60,20 L70,32 L60,44 L60,38 L50,38Z" fill="url(#hg)"/>
          </svg>
          <span className="font-bold text-xl text-gray-900">View<span className="text-[#6C63FF]">Shift</span></span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
          <a href="#" className="hover:text-gray-900">How it works</a>
          <a href="https://www.youtube.com/@saran.gandhi" target="_blank" className="hover:text-gray-900">YouTube</a>
          <a href="https://tally.so/r/q4YjAg" target="_blank" className="bg-[#6C63FF] text-white px-4 py-1.5 rounded-full text-sm hover:bg-[#5952e0] transition-colors">Work with Saran</a>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          YouTube, <span className="text-[#6C63FF]">uncomplicated.</span><br/>
          Search like you actually want to.
        </h1>
        <p className="text-gray-500 text-lg mb-10 max-w-2xl mx-auto">
          Find the right video, the right moment, and the comments that actually help — without fighting the algorithm.
        </p>

        {/* Main Search Box */}
        <div
          className={`relative border-2 rounded-2xl transition-all ${isDragging ? 'border-[#6C63FF] bg-purple-50' : 'border-gray-200 bg-white'} shadow-sm`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="flex items-center px-4 py-3 gap-3">
            {/* Search icon */}
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={isDragging ? 'Drop your screenshot here...' : 'Search YouTube without the algorithm...'}
              className="flex-1 text-base text-gray-800 placeholder-gray-400 outline-none bg-transparent"
            />

            {/* Voice search */}
            <button
              onClick={handleVoiceSearch}
              className={`p-2 rounded-full transition-colors flex-shrink-0 ${isListening ? 'bg-red-100 text-red-500 animate-pulse' : 'text-gray-400 hover:text-[#6C63FF] hover:bg-purple-50'}`}
              title="Voice search"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>

            {/* Image upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full text-gray-400 hover:text-[#6C63FF] hover:bg-purple-50 transition-colors flex-shrink-0"
              title="Search by image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}/>

            {/* Search button */}
            <button
              onClick={() => handleSearch()}
              disabled={isSearching || !query.trim()}
              className="bg-[#6C63FF] text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-[#5952e0] transition-colors disabled:opacity-40 flex-shrink-0"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Drag overlay hint */}
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-purple-50 border-2 border-[#6C63FF] border-dashed">
              <p className="text-[#6C63FF] font-medium">Drop your YouTube screenshot to search</p>
            </div>
          )}
        </div>

        {/* URL Input toggle */}
        <div className="mt-3">
          <button
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-sm text-gray-400 hover:text-[#6C63FF] transition-colors"
          >
            {showUrlInput ? '▲ Hide' : '▼ Or paste a YouTube URL to analyse a specific video'}
          </button>
          {showUrlInput && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyseUrl()}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-[#6C63FF] transition-colors"
              />
              <button
                onClick={handleAnalyseUrl}
                className="bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors whitespace-nowrap"
              >
                Analyse Video
              </button>
            </div>
          )}
        </div>

        {/* Helper chips */}
        {!hasSearched && (
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {['How to fix a leaking tap', 'Best budget laptop 2025', 'Learn Python basics', 'Office chair gas cylinder replacement'].map((chip) => (
              <button
                key={chip}
                onClick={() => { setQuery(chip); handleSearch(chip); }}
                className="text-xs text-gray-500 border border-gray-200 rounded-full px-3 py-1.5 hover:border-[#6C63FF] hover:text-[#6C63FF] transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Results */}
      {hasSearched && (
        <section className="max-w-5xl mx-auto px-6 pb-16">
          {isSearching ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                  <div className="bg-gray-100 h-44 w-full"/>
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-3/4"/>
                    <div className="h-3 bg-gray-100 rounded w-1/2"/>
                  </div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">No results found. Try a different search.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-400 mb-4">{results.length} results — ranked by relevance, not views</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((video) => (
                  <div
                    key={video.id}
                    className="group rounded-2xl border border-gray-100 overflow-hidden hover:border-[#6C63FF] hover:shadow-md transition-all flex flex-col"
                  >
                    {/* Clickable area → YouTube video (opens in new tab) */}
                    <a
                      href={`https://www.youtube.com/watch?v=${video.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block cursor-pointer"
                    >
                      {/* Thumbnail */}
                      <div className="relative">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-44 object-cover"
                        />
                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-1.5 py-0.5 rounded">
                          {video.duration}
                        </div>
                        {/* VS Score badge */}
                        <div className="absolute top-2 left-2 bg-[#6C63FF] text-white text-xs px-2 py-1 rounded-full font-bold">
                          VS {video.vsScore}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-[#6C63FF] transition-colors mb-1">
                          {video.title}
                        </h3>
                        <p className="text-xs text-gray-500 mb-1">{video.channel}</p>
                        <p className="text-xs text-gray-400">{video.views} views · {video.published}</p>
                      </div>
                    </a>

                    {/* Analyse with AI button — opens /analyse in new tab */}
                    <a
                      href={`/analyse?v=${video.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-auto mx-4 mb-4 bg-[#6C63FF] text-white text-sm font-semibold py-2.5 px-4 rounded-xl hover:bg-[#5952e0] transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"/>
                      </svg>
                      <span>Analyse with AI</span>
                    </a>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* Features — shown before search */}
      {!hasSearched && (
        <section className="max-w-4xl mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {[
              { icon: '🎯', title: 'Relevance, not views', desc: 'Results ranked by how well they match your problem — not how many clicks they got.' },
              { icon: '⚡', title: 'AI video verdict', desc: 'Know if a video is worth your time before you watch it. Scorecard + two-sentence summary.' },
              { icon: '💬', title: 'Comment intelligence', desc: 'The top 3 most useful comments surfaced — fixes, warnings, and hidden gems.' },
            ].map((f) => (
              <div key={f.title} className="text-center p-6 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-400">
            Built by{' '}
            <a href="https://tally.so/r/q4YjAg" target="_blank" className="text-[#6C63FF] hover:underline">
              Saran Gandhi
            </a>
            {' '}— Strategy Consultant & AI Adoption Expert
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>No login required</span>
            <span>·</span>
            <span>No data stored</span>
            <span>·</span>
            <a href="https://www.youtube.com/@saran.gandhi" target="_blank" className="hover:text-[#6C63FF]">YouTube</a>
            <span>·</span>
            <a href="https://theviewshiftbrief.beehiiv.com" target="_blank" className="hover:text-[#6C63FF]">Newsletter</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
