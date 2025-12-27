const socket = io();
const room = "room1";

const audiosContainer = document.getElementById("audios");
const acceptBtn = document.getElementById("acceptBtn");
const startCallBtn = document.getElementById("startCallBtn");
const status = document.getElementById("status");

let localStream;
const peers = {}; // accepterId -> RTCPeerConnection

// Join room
socket.emit("join", room);

// Get audio only
navigator.mediaDevices.getUserMedia({ audio: true, video: false })
  .then(stream => {
    localStream = stream;

    // Optional: hear self muted
    const audio = document.createElement("audio");
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.muted = true;
    audiosContainer.appendChild(audio);
  })
  .catch(err => console.error("Error accessing microphone:", err));

// ================= CALLER =================
startCallBtn.onclick = () => {
  socket.emit("call-user", room);
  status.innerText = "Calling...";
};

// ================= RECEIVER =================
socket.on("incoming-call", ({ callerId }) => {
  status.innerText = "Incoming Call...";
  acceptBtn.style.display = "inline-block";

  acceptBtn.onclick = () => {
    acceptBtn.style.display = "none";
    socket.emit("accept-call", { callerId });
    status.innerText = "Call Accepted!";
  };
});

// ================= CALLER: someone accepted =================
socket.on("call-accepted", async ({ accepterId }) => {
  const pc = createPeer(accepterId);
  peers[accepterId] = pc;

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit("offer", { to: accepterId, offer });
});

// ================= RECEIVER: receive offer =================
socket.on("offer", async ({ from, offer }) => {
  const pc = createPeer(from);
  peers[from] = pc;

  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit("answer", { to: from, answer });
});

// ================= CALLER: receive answer =================
socket.on("answer", async ({ from, answer }) => {
  await peers[from].setRemoteDescription(answer);
});

// ================= ICE =================
socket.on("ice", ({ from, candidate }) => peers[from].addIceCandidate(candidate));

// ================= CREATE PEER =================
function createPeer(remoteId) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  // Add local audio track
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

  // Remote stream
  pc.ontrack = e => {
    const audio = document.createElement("audio");
    audio.srcObject = e.streams[0];
    audio.autoplay = true;
    audiosContainer.appendChild(audio);
  };

  // ICE candidates
  pc.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("ice", { to: remoteId, candidate: e.candidate });
    }
  };

  return pc;
}
