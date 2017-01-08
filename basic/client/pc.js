// 与信令服务器的WebSocket连接
var signalingChannel = new WebSocket("wss:" + window.location.host);//信令通道
var pc;//对等连接全局变量
var webcam//本地媒体流全局变量;

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
/**
 * 创建对等连接
 */
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
        attachMediaStream("remoteVideo", event.stream);
    };
}
/**
 * 获取本地媒体流
 */
function getMedia() {
    // 获取本地音频和视频流
    getUserMedia.call(navigator, {
        "audio": true,
        "video": true
    }, function (stream) {
        console.log("getMedia获取本地音视频成功");
        webcam = stream;
        attachMediaStream("localVideo", stream);
    }, error);
}
/**
 * 信令打开时
 */
signalingChannel.onopen = function () {
    console.log("pc信令通过已打开socket opened");
    //获取本地媒体流并显示
    getMedia();
    //创建对等连接等待用户连接
    createPeerConnection();
}
/**
 *
 * 处理到来的信令
 */
signalingChannel.onmessage = function (msg) {
    console.log('onmessage:', msg);
    var signal = JSON.parse(msg.data);
    //如果是一个ICE的候选，则将其加入到PeerConnection中，否则设定对方的session描述为传递过来的描述
    if (signal.sdp) {
        pc.setRemoteDescription(new RTCSessionDescription(signal.sdp), function () {
            console.log("-----setRemoteDescription")
        });
        if (signal.sdp.type === 'answer') {
            sendMedia();
        }
        if (signal.sdp.type === 'offer') {
            called();
        }
    } else if (signal.candidate) {
        console.log("-----addIceCandidate")
        pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
    }
};

/**
 * 发送媒体流到连接
 */
function sendMedia() {
    console.log("将本地音视频附加到对等连接,并通过信令发送", webcam);
    pc.addStream(webcam, function (data) {
        console.log("---sendMedia----", data);
    }, error);

    webcam.getTracks().forEach(function(track){
        //pc.addTrack(track)
        console.log(track);
    });
}
/**
 * 绑定媒体流到指定标签区域
 * @param id
 * @param stream
 */
function attachMediaStream(id, stream) {
    console.log("attachMediaStream", stream);
    $("#" + id).attr("src", URL.createObjectURL(stream));
}
/**
 * 收到呼叫
 */
function called() {
    $("#answer").attr("disabled", false);
}

/**
 * 接听方法
 */
function answer() {
    pc.createAnswer(function (desc) {
        console.log("answer send:", desc);
        pc.setLocalDescription(desc, function () {
            signalingChannel.send(JSON.stringify({"sdp": desc}));
        })
    }, error);
    sendMedia();
}
/**
 * 发起呼叫
 */
function call() {
    pc.createOffer(function (desc) {
        console.log("offer send:", desc);
        pc.setLocalDescription(desc, function () {
            signalingChannel.send(JSON.stringify({"sdp": desc}));
        });
    }, error);
}
/**
 * 挂断动作
 */
function hangup() {
    console.log("hangup");
    pc.removeStream(webcam);
}

function error(data) {
    console.error("error:", data);
}

