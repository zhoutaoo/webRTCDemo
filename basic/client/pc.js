// 与信令服务器的WebSocket连接
var signalingChannel = new WebSocket("wss://localhost:3000");
var pc;
var webcam, left, right;

//兼容浏览器的getUserMedia写法
var getUserMedia = (navigator.getUserMedia ||
navigator.webkitGetUserMedia ||
navigator.mozGetUserMedia ||
navigator.msGetUserMedia);
//兼容浏览器的PeerConnection写法
var PeerConnection = (window.PeerConnection ||
window.webkitPeerConnection00 ||
window.webkitRTCPeerConnection ||
window.mozRTCPeerConnection);

// stun和turn服务器
var ICE_SERVER = {
    "iceServers": [{
        "url": "stun:stun.l.google.com:19302"
    }, {
        "url": "turn:numb.viagenie.ca",
        "username": "webrtc@live.com",
        "credential": "muazkh"
    }]
};

signalingChannel.onopen = function () {
    console.log("pc信令通过已打开socket opened");
    //获取本地媒体流
    getMedia();
    //创建对等连接
    createPeerConnection();
}

//处理到来的信令
signalingChannel.onmessage = function (msg) {
    console.log('onmessage:', msg);
    var signal = JSON.parse(msg.data);
    //如果是一个ICE的候选，则将其加入到PeerConnection中，否则设定对方的session描述为传递过来的描述
    if (signal.sdp) {
        pc.setRemoteDescription(new RTCSessionDescription(signal.sdp), function () {
            console.log("-----setRemoteDescription")
        });
        answer();
    } else if (signal.candidate) {
        console.log("-----addIceCandidate")
        pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
    } else {
        //将媒体关联到对等连接
        console.log(signal);
        attachMedia();
    }
};

function createPeerConnection() {
    // 创建PeerConnection实例 (参数为null则没有iceserver，即使没有stunserver和turnserver，仍可在局域网下通讯)
    pc = new PeerConnection(ICE_SERVER);
    // 发送ICE候选到其他客户端
    pc.onicecandidate = function (event) {
        console.log("onicecandidate event:", event);
        signalingChannel.send(JSON.stringify({"candidate": event.candidate}));
    };
    // 如果检测到媒体流连接到本地，将其绑定到一个video标签上输出
    pc.onaddstream = function (event) {
        console.log("onaddstream event:", event);
        handleIncomingStream(event.stream)
    };
}

function getMedia() {
    // 获取本地音频和视频流
    getUserMedia.call(navigator, {
        "audio": true,
        "video": true
    }, function (stream) {
        console.log("getMedia获取本地音视频成功");
        webcam = stream;
        document.getElementById("localVideo").src = URL.createObjectURL(stream);
    }, function (error) {
        //处理媒体流创建失败错误
        console.log('getUserMedia error: ' + error);
    });
}

function attachMedia() {
    console.log("attachMedia:", webcam.constructor);
    console.log("将本地音视频附加到对等连接,并通过信令发送");
    pc.addStream(webcam, function (data) {
        console.error("-------", data);
    }, error);
    signalingChannel.send(JSON.stringify({"ok": "ok"}));
}

function handleIncomingStream(stream) {
    console.log("handleIncomingStream", stream.constructor);
    document.getElementById("remoteVideo").src = URL.createObjectURL(stream);
}

function answer() {
    console.log("pc answer");
    pc.createAnswer(function (desc) {
        pc.setLocalDescription(desc, function () {
            signalingChannel.send(JSON.stringify({"sdp": desc}));
        })
    }, error);
}

function error(data) {
    console.error("error:", data);
}

