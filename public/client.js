document.onreadystatechange = function () {
    if (document.readyState === "complete") {
      var weekdays = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
      var tomorrow = false;
      var today = new Date();

      if (today.getHours() > 8 && today.getHours() < 20) {
        document.body.classList.add('daylight')
      }

      var greetingtext = 'god ';

      if (today.getHours() < 6) {
        greetingtext += 'natt';
      } else if (today.getHours() < 11) {
        greetingtext += 'morgon';
      } else if (today.getHours() < 18) {
        greetingtext += 'dag';
      } else {
        greetingtext += 'kväll';
      }

      greetingtext += ', ';

      if (today.getHours() >= 22) {
        tomorrow = true;
        greetingtext += 'imorgon är det ' + weekdays[today.getDay()+1];
      } else {
        greetingtext += 'idag är det ' + weekdays[today.getDay()];
      }

      document.getElementById('greeting').innerHTML = greetingtext;

      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
          var response = JSON.parse(xhr.responseText);
          if (response === '' || response.length === 0) {
            document.getElementById('tv').innerHTML = 'och ingenting på tv';
          } else if (response.length === 1) {
            document.getElementById('tv').innerHTML = 'men du kan åtminstone glo på det nya avsnittet av ' + response[0].toLowerCase();
          } else {
            var tvtext = 'men du kan åtminstone glo på nya avsnitt av ' + response[0].toLowerCase();
            for ( i=1; i < response.length-1; i++) {
              tvtext += ', ' + response[i].toLowerCase();
            }
            tvtext += ' och ' + response[response.length-1].toLowerCase();
            document.getElementById('tv').innerHTML = tvtext;
          }
        }
      }
      xhr.open('GET', 'calendar');
      xhr.send();
    }
};
