var QueueConsumer = function (queueName, logname) {
    'use strict';
    var consumer = {};
    consumer.session = null;
    consumer.flow = null;
    consumer.queueName = queueName;
    consumer.queueDestination = new solace.Destination(consumer.queueName, solace.DestinationType.QUEUE);
    consumer.consuming = false;

    // Logger
    consumer.log = function (line) {
        var now = new Date();
        var time = [('0' + now.getHours()).slice(-2), ('0' + now.getMinutes()).slice(-2),
            ('0' + now.getSeconds()).slice(-2)];
        var timestamp = '[' + time.join(':') + '] ';
        console.log(timestamp + line);
        var logTextArea = document.getElementById(logname);
        logTextArea.innerHTML += timestamp + line + '<br />';
        logTextArea.scrollTop = logTextArea.scrollHeight;
    };

    consumer.table = function (messagee) {
        var table = document.getElementById("table2");
        var row = table.insertRow(-1);
        var cell1 = row.insertCell(0);
        cell1.innerHTML = messagee;
    }
    consumer.log('\n*** Consumer to queue "' + consumer.queueName + '" is ready to connect ***');

    // Establishes connection to Solace message router
    consumer.connect = function () {
        if (consumer.session !== null) {
            consumer.log('Already connected and ready to consume messages.');
            return;
        }
        var hosturl = account.HOSTURL;
        var username = account.USERNAME;
        var pass = account.PASS;
        var vpn = account.VPN;

        consumer.log('Connecting to Solace message router using url: ' + hosturl);
        consumer.log('Client username: ' + username);
        consumer.log('Solace message router VPN name: ' + vpn);
        // create session
        try {
            consumer.session = solace.SolclientFactory.createSession({
                // solace.SessionProperties
                url:      hosturl,
                vpnName:  vpn,
                userName: username,
                password: pass,
            });
        } catch (error) {
            consumer.log(error.toString());
        }
        // define session event listeners
        consumer.session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
            consumer.log('=== Successfully connected and ready to start the message consumer. ===');
        });
        consumer.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, function (sessionEvent) {
            consumer.log('Connection failed to the message router: ' + sessionEvent.infoStr +
                ' - check correct parameter values and connectivity!');
        });
        consumer.session.on(solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
            consumer.log('Disconnected.');
            consumer.consuming = false;
            if (consumer.session !== null) {
                consumer.session.dispose();
                consumer.session = null;
            }
        });

        consumer.connectToSolace();   

    };

    // Actually connects the session triggered when the iframe has been loaded - see in html code
    consumer.connectToSolace = function () {
        try {
            consumer.session.connect();
        } catch (error) {
            consumer.log(error.toString());
        }
    };

    // Starts consuming from a queue on Solace message router
    consumer.startConsume = function () {
        if (consumer.session !== null) {
            if (consumer.consuming) {
                consumer.log('Already started consumer for queue "' + consumer.queueName + '" and ready to receive messages.');
            } else {
                consumer.log('Starting consumer for queue: ' + consumer.queueName);
                try {
                    // Create a message consumer
                    consumer.messageConsumer = consumer.session.createMessageConsumer({
                        // solace.MessageConsumerProperties
                        queueDescriptor: { name: consumer.queueName, type: solace.QueueType.QUEUE },
                        acknowledgeMode: solace.MessageConsumerAcknowledgeMode.CLIENT, // Enabling Client ack
                    });
                    // Define message consumer event listeners
                    consumer.messageConsumer.on(solace.MessageConsumerEventName.UP, function () {
                        consumer.consuming = true;
                        consumer.log('=== Ready to receive messages. ===');
                    });
                    consumer.messageConsumer.on(solace.MessageConsumerEventName.CONNECT_FAILED_ERROR, function () {
                        consumer.consuming = false;
                        consumer.log('=== Error: the message consumer could not bind to queue "' + consumer.queueName +
                            '" ===\n   Ensure this queue exists on the message router vpn');
                    });
                    consumer.messageConsumer.on(solace.MessageConsumerEventName.DOWN, function () {
                        consumer.consuming = false;
                        consumer.log('=== The message consumer is now down ===');
                    });
                    consumer.messageConsumer.on(solace.MessageConsumerEventName.DOWN_ERROR, function () {
                        consumer.consuming = false;
                        consumer.log('=== An error happened, the message consumer is down ===');
                    });
                    // Define message received event listener
                    consumer.messageConsumer.on(solace.MessageConsumerEventName.MESSAGE, function (message) {
                        var result = message.getBinaryAttachment();
                        // assuming if message is a message if less than 255, else image
                        if (result.length < 255) {
                            consumer.log('Received message: "' + result + '",' +
                            ' details:\n' + message.dump());
                            // Need to explicitly ack otherwise it will not be deleted from the message router
                            consumer.table(message.getBinaryAttachment())
                            message.acknowledge();
                        } else {
                            //convert and show image
                            var imgbyte = result.split(",");
                            var base64String = btoa(String.fromCharCode.apply(null, new Uint8Array(imgbyte)));
                            consumer.log('Received Image: <br /><img id=\"ItemView\" src=\"data:image/png;base64,' + base64String + '\" />');
                            consumer.table('<br /><img id=\"ItemView\" style="display:block;" width="400px  " height="50%" src=\"data:image/png;base64,' + base64String + '\" />')
                            message.acknowledge();
                        }
                        
                    });
                    // Connect the message consumer
                    consumer.messageConsumer.connect();
                } catch (error) {
                    consumer.log(error.toString());
                }
            }
        } else {
            consumer.log('Cannot start the queue consumer because not connected to Solace message router.');
        }
    };

    // Disconnects the consumer from queue on Solace message router
    consumer.stopConsume = function () {
        if (consumer.session !== null) {
            if (consumer.consuming) {
                consumer.consuming = false;
                consumer.log('Disconnecting consumption from queue: ' + consumer.queueName);
                try {
                    consumer.messageConsumer.disconnect();
                    consumer.messageConsumer.dispose();
                } catch (error) {
                    consumer.log(error.toString());
                }
            } else {
                consumer.log('Cannot disconnect the consumer because it is not connected to queue "' +
                    consumer.queueName + '"');
            }
        } else {
            consumer.log('Cannot disconnect the consumer because not connected to Solace message router.');
        }
    };

    // Gracefully disconnects from Solace message router
    consumer.disconnect = function () {
        consumer.log('Disconnecting from Solace message router...');
        if (consumer.session !== null) {
            try {
                consumer.session.disconnect();
            } catch (error) {
                consumer.log(error.toString());
            }
        } else {
            consumer.log('Not connected to Solace message router.');
        }
    };

    return consumer;
};
