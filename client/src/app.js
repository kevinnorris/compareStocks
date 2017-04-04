document.body.onload = () => {
  console.log('body loaded');
  function socketExample() {
    const socket = new WebSocket('ws://localhost:8080/');

    socket.onopen = function() {
      console.log('Socket open.');
      socket.send(JSON.stringify({message: 'What is the meaning of life'}));
      console.log('Message sent.');
    };

    socket.onmessage = function(message) {
      console.log(`Socket server message: ${message}`);
      const data = JSON.parse(message.data);
      document.getElementById('response').innerHTML = JSON.stringify(data, null, 2);
    };
  }

  function postExample() {
    console.log('Creating regular POST message');

    fetch('/', {
      method: 'post',
      headers: {
        'Content-type': 'application/json',
      },
      body: JSON.stringify({message: 'What is the meaning of post-life, the universe and everything?'}),
    })
    .then(response => response.json())
    .then((data) => {
      console.log('POST response:', data);
      document.getElementById('post-response').innerHTML = JSON.stringify(data, null, 2);
    })
    .catch((error) => {
      console.log('Request failed', error);
    });
  }

  socketExample();
  postExample();
};
