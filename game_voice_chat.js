(() => {
  const state = { peers: new Map(), stream: null, muted: false, roomId: null };
  const cfg = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  function roomId() {
    return window.state?.friendlyMatchId || window.state?.gameRoomId || window.state?.roomId || null;
  }

  function renderVoice() {
    let box = document.querySelector('#voiceChatBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'voiceChatBox';
      box.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:9999;background:#111;color:#fff;padding:10px;border-radius:12px;box-shadow:0 4px 20px #0005;font:14px system-ui;';
      document.body.appendChild(box);
    }
    box.innerHTML = `<b>Voice chat</b><br><button id="voiceJoin">${state.stream ? 'Voice on' : 'Join voice'}</button> <button id="voiceMute" ${state.stream ? '' : 'disabled'}>${state.muted ? 'Unmute' : 'Mute'}</button><div id="voiceStatus" style="margin-top:6px;opacity:.75">${state.stream ? 'Microphone connected' : 'Not connected'}</div>`;
    box.querySelector('#voiceJoin').onclick = join;
    box.querySelector('#voiceMute').onclick = toggleMute;
  }

  async function join() {
    if (!roomId()) return alert('Join a game room before using voice chat.');
    if (!navigator.mediaDevices?.getUserMedia) return alert('Voice chat is not supported by this browser.');
    try {
      if (!state.stream) state.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      renderVoice();
    } catch (e) {
      alert('Microphone access was not granted. Please allow microphone access for this website.');
    }
  }

  function toggleMute() {
    state.muted = !state.muted;
    state.stream?.getAudioTracks().forEach(t => t.enabled = !state.muted);
    renderVoice();
  }

  function cleanup() {
    state.peers.forEach(pc => pc.close());
    state.peers.clear();
    state.stream?.getTracks().forEach(t => t.stop());
    state.stream = null;
    state.muted = false;
  }

  window.addEventListener('beforeunload', cleanup);
  window.gameVoiceChat = { join, cleanup, toggleMute };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderVoice); else renderVoice();
})();
