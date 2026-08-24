(() => {
  'use strict';
  const state = { peers: new Map(), pendingIce: new Map(), stream: null, muted: false, roomId: null, channel: null, joined: false, userId: null };
  const cfg = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };
  const roomId = () => window.state?.gameRoomId || window.state?.friendlyMatchId || window.state?.roomId || null;
  const userId = () => window.state?.user?.id || null;
  const send = (to, type, payload = {}) => { if (!state.channel || !state.joined) return; state.channel.send({ type: 'broadcast', event: 'voice-signal', payload: { from: state.userId, to, type, ...payload } }); };
  const ensureAudio = (id, stream) => { let el = document.querySelector('#voice-audio-' + id); if (!el) { el = document.createElement('audio'); el.id = 'voice-audio-' + id; el.autoplay = true; el.playsInline = true; el.style.display = 'none'; document.body.appendChild(el); } el.srcObject = stream; el.play().catch(() => {}); };
  async function makePeer(id, initiator) {
    if (!state.stream || !id || id === state.userId) return null;
    let pc = state.peers.get(id); if (pc) return pc;
    pc = new RTCPeerConnection(cfg); state.peers.set(id, pc);
    state.stream.getTracks().forEach(t => pc.addTrack(t, state.stream));
    pc.onicecandidate = e => { if (e.candidate) send(id, 'ice', { candidate: e.candidate }); };
    pc.ontrack = e => { if (e.streams[0]) ensureAudio(id, e.streams[0]); };
    pc.onconnectionstatechange = () => { if (['failed','closed','disconnected'].includes(pc.connectionState)) { if (pc.connectionState === 'failed') { pc.close(); state.peers.delete(id); } document.querySelector('#voice-audio-' + id)?.remove(); } };
    if (initiator) { const offer = await pc.createOffer({ offerToReceiveAudio: true }); await pc.setLocalDescription(offer); send(id, 'offer', { description: pc.localDescription }); }
    return pc;
  }
  async function handleSignal(p) {
    if (!p || p.from === state.userId || !state.stream) return;
    if (p.type === 'hello') { await makePeer(p.from, state.userId < p.from); return; }
    if (p.to !== state.userId) return;
    if (p.type === 'offer') {
      const pc = await makePeer(p.from, false); if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(p.description));
      const queued = state.pendingIce.get(p.from) || []; for (const c of queued) { try { await pc.addIceCandidate(c); } catch (_) {} } state.pendingIce.delete(p.from);
      const answer = await pc.createAnswer(); await pc.setLocalDescription(answer); send(p.from, 'answer', { description: pc.localDescription });
    } else if (p.type === 'answer') {
      const pc = state.peers.get(p.from); if (pc) { await pc.setRemoteDescription(new RTCSessionDescription(p.description)); const queued = state.pendingIce.get(p.from) || []; for (const c of queued) { try { await pc.addIceCandidate(c); } catch (_) {} } state.pendingIce.delete(p.from); }
    } else if (p.type === 'ice') {
      const pc = state.peers.get(p.from);
      if (pc?.remoteDescription) { try { await pc.addIceCandidate(p.candidate); } catch (_) {} }
      else { const q = state.pendingIce.get(p.from) || []; q.push(p.candidate); state.pendingIce.set(p.from, q); }
    }
  }
  function connectChannel() {
    const rid = roomId(), uid = userId(); if (!rid || !uid || !window.supabase) return false;
    if (state.channel && state.roomId === rid && state.userId === uid) return true;
    if (state.channel) window.supabase.removeChannel(state.channel);
    state.roomId = rid; state.userId = uid; state.joined = false;
    state.channel = window.supabase.channel('voice-room-' + rid, { config: { broadcast: { self: false } } });
    state.channel.on('broadcast', { event: 'voice-signal' }, ({ payload }) => handleSignal(payload)).subscribe(status => { if (status === 'SUBSCRIBED') { state.joined = true; send(null, 'hello'); } });
    return true;
  }
  async function join() {
    if (!roomId()) return alert('Join a game room before using voice chat.');
    if (!userId()) return alert('Please sign in before joining voice chat.');
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) return alert('Voice chat is not supported by this browser.');
    try { if (!state.stream) state.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }); if (!connectChannel()) throw new Error('Could not connect to the game voice channel.'); renderVoice('Connected — waiting for other players'); } catch (e) { alert('Could not start voice chat: ' + (e.message || e)); }
  }
  const toggleMute = () => { state.muted = !state.muted; state.stream?.getAudioTracks().forEach(t => { t.enabled = !state.muted; }); renderVoice(); };
  function cleanup() { state.peers.forEach(pc => pc.close()); state.peers.clear(); state.pendingIce.clear(); if (state.channel && window.supabase) window.supabase.removeChannel(state.channel); state.channel = null; state.joined = false; state.stream?.getTracks().forEach(t => t.stop()); state.stream = null; state.roomId = null; state.userId = null; document.querySelectorAll('[id^="voice-audio-"]').forEach(e => e.remove()); }
  function renderVoice(statusText) { let box = document.querySelector('#voiceChatBox'); if (!box) { box = document.createElement('div'); box.id = 'voiceChatBox'; box.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:9999;background:#111;color:#fff;padding:10px;border-radius:12px;box-shadow:0 4px 20px #0005;font:14px system-ui;'; document.body.appendChild(box); } box.innerHTML = `<b>🎙️ Voice chat</b><br><button id="voiceJoin">${state.stream ? 'Voice connected' : 'Join voice'}</button> <button id="voiceMute" ${state.stream ? '' : 'disabled'}>${state.muted ? 'Unmute' : 'Mute'}</button><div id="voiceStatus" style="margin-top:6px;opacity:.75">${statusText || (state.stream ? 'Microphone connected' : 'Not connected')}</div>`; box.querySelector('#voiceJoin').onclick = join; box.querySelector('#voiceMute').onclick = toggleMute; }
  setInterval(() => { const rid = roomId(); if (rid && userId() && state.stream && (!state.channel || state.roomId !== rid)) connectChannel(); }, 1500);
  window.addEventListener('beforeunload', cleanup); window.gameVoiceChat = { join, cleanup, toggleMute }; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderVoice); else renderVoice();
})();
