function processTemp(uriBase, callback) {

  // Request parameters.
  var now = new Date();
  var month = ("0" + (now.getMonth() + 1).toString()).slice(-2);
  var date = ("0" + now.getDate().toString()).slice(-2);
  var hour = ("0" + now.getHours().toString()).slice(-2);
  var minute = ("0" + now.getMinutes().toString()).slice(-2);
  var second = ("0" + now.getSeconds().toString()).slice(-2);
  var today = now.getFullYear() + '-' + month + '-' + date + 'T' + hour + ':' + minute + ':' + second;
  var params = {
      "date_time": today
  };

  $.ajax({
      url: uriBase + "?" + $.param(params),

      beforeSend: function(xhrObj){
          xhrObj.setRequestHeader("Content-Type","application/json");
      },

      type: "GET",
  })

  .done(function(data) {
      result = JSON.parse(JSON.stringify(data,null,2));
      var sensor = result.metadata.stations;
      var resdict = [];
      for (var i = 0; i < sensor.length; i++){
        resdict.push({"id" : sensor[i].id, "name" : sensor[i].name, "location" : sensor[i].location, "value" : result.items[0].readings[i].value, "timestamp" : result.items[0].timestamp});
        if (resdict.length >= sensor.length) {
          callback(resdict);
        }
      }

  })

  .fail(function(jqXHR, textStatus, errorThrown) {
      // Display error message.
      var errorString = (errorThrown === "") ? "Error. " :
          errorThrown + " (" + jqXHR.status + "): ";
      errorString += (jqXHR.responseText === "") ? "" :
          jQuery.parseJSON(jqXHR.responseText).message;
      alert(errorString);
  });
  };