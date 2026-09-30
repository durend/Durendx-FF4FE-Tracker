function usb2snes() {
    const methods = {};

    let ws = null;
    let busy = false;

    methods.get_ws = get_ws;
    function get_ws() {
        return ws;
    }

    methods.clearBusy = clearBusy;
    function clearBusy() {
        busy = false;
    }

    methods.create_message = create_message;
    function create_message(opcode, operands, space = "SNES") {
        return JSON.stringify({
            "Opcode": opcode,
            "Space": space,
            "Flags": null,
            "Operands": operands
        });
    }

    methods.connect = connect;
    function connect(url) {
        return new Promise(function (resolve, reject) {
            if (busy) {
                reject("BUSY");
            }

            busy = true;
            var socket = new WebSocket(url);
            socket.onopen = function () {
                ws = socket;
                busy = false;
                resolve(socket);
            };

            socket.onerror = function (err) {
                busy = false;
                reject(err);
            };
        });
    }

    // Requests go out one at a time, in order: each waits for the previous
    // reply. (Previously an overlapping request was "rejected" as BUSY but sent
    // anyway and took over the reply handler, so replies could land on the
    // wrong request - rare on emulators, constant on slow hardware.)
    //
    // A GetAddress reply can arrive split over several binary messages
    // (common with FXPak/SD2SNES); the chunks are collected until the full
    // requested length has arrived, and the caller gets { data: Blob } as
    // before. If a reply never completes, the socket is closed so stray late
    // chunks can't be mistaken for the next reply; network.js reconnects.
    const REPLY_TIMEOUT_MS = 3000;
    let queue = Promise.resolve();

    function expectedReplyBytes(msg) {
        try {
            const m = JSON.parse(msg);
            if (m.Opcode !== "GetAddress" || !Array.isArray(m.Operands)) return 0;
            let total = 0;
            for (let i = 1; i < m.Operands.length; i += 2) {
                total += parseInt(m.Operands[i], 16) || 0;
            }
            return total;
        } catch (e) {
            return 0;
        }
    }

    methods.send = send;
    function send(msg, noReply = false, timeOut = 1) {
        const run = () => new Promise(function (resolve, reject) {
            if (!ws || ws.readyState !== 1) {
                reject("NOT_CONNECTED");
                return;
            }
            ws.send(msg);

            if (noReply) {
                setTimeout(function () { resolve(true); }, timeOut);
                return;
            }

            const expected = expectedReplyBytes(msg);
            const chunks = [];
            let received = 0;
            const socket = ws;

            const timer = setTimeout(function () {
                socket.onmessage = null;
                try { socket.close(); } catch (e) { /* already closing */ }
                reject(false);
            }, REPLY_TIMEOUT_MS);

            socket.onmessage = function (event) {
                if (expected > 0 && event.data instanceof Blob) {
                    chunks.push(event.data);
                    received += event.data.size;
                    if (received < expected) return;
                    clearTimeout(timer);
                    socket.onmessage = null;
                    resolve({ data: new Blob(chunks).slice(0, expected) });
                } else {
                    clearTimeout(timer);
                    socket.onmessage = null;
                    resolve(event);
                }
            };

            socket.onerror = function (err) {
                clearTimeout(timer);
                reject(err);
            };
        });

        const result = queue.then(run, run);
        queue = result.catch(function () {});
        return result;
    }

    methods.getFile = getFile;
    async function getFile(msg, noReply = false, timeOut = 1) {
        return new Promise(function (resolve, reject) {
            if (busy) {
                reject("BUSY");
            }

            busy = true;

           let fileLength = 0x200000;
           let fileSoFar = 0;
           let fileMetadataPromise = new Promise((resolve, reject) => { resolve({start: 0, length: 0}); });
           let fileMetadataStart = 0;
           let fileMetadataLength = 0;
           let fileMetadataSoFar = 0;
           let fileBits = [];

            ws.onmessage = function (event) {
                if(event.data instanceof Blob) {
                  // binary frame
                  let myBlob = event.data;
                  if (fileSoFar + myBlob.size > 0x1FF000) {
                    if (fileSoFar <= 0x1FF000) {
                      let asyncFileSoFar = fileSoFar;
                      // This is the first chunk that might have the data we Needs
                      fileMetadataPromise = fileMetadataPromise.then(() => {
                        return myBlob.arrayBuffer().then(ab => {
                          let possibleMetadataLength = new Uint32Array(ab);
                          let index = 0x1FF000 - asyncFileSoFar;
                          fileMetadataLength = possibleMetadataLength[index/4];
                          fileMetadataStart = index+4;
                          return {start: fileMetadataStart, length: fileMetadataLength}
                      }) });
                    }
                    fileBits.push(myBlob);
                    fileMetadataSoFar += myBlob.size;
                  }
                  fileSoFar += myBlob.size;
                  if (fileSoFar >= fileLength) { // This is the last chunk time to make that callout
                    resolve(fileMetadataPromise.then((metadataStats) => {
                      if ( fileMetadataSoFar - metadataStats.start >= metadataStats.length) {
                        let metadataBlobAndStuff = new Blob(fileBits);
                        let metadataBlob = metadataBlobAndStuff.slice(metadataStats.start,metadataStats.start+metadataStats.length);
                        busy = false;
                        let textPromise = metadataBlob.text();
                        return textPromise;
                      }
                    }));
                  }
                } else {
                  // text frame: the file length
                 fileLength = parseInt(JSON.parse(event.data)["Results"][0], 16);
                }
            };

            ws.onerror = function (err) {
                busy = false;
                reject(err);
            };

            ws.send(msg);
        });
    }

    return methods;
}
