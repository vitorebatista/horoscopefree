
# What is horoscopefree?
horoscopefree REST API allows developers to access and integrate the functionality of horoscopefree.com with other applications. The API retrieves daily horoscopes.

Feel free to contribute on [Github](http://github.com/vitorebatista/horoscopefree)

## Usage

    GET: https://horoscopefree.herokuapp.com/daily/


## Example
The following example is for sun sign aries - 

### cURL
```cUrl
    curl -X GET \
    'https://horoscopefree.herokuapp.com/daily/'
```

### Python

```python
    import requests

    requests.get('https://horoscopefree.herokuapp.com/daily/'')
```

### Node.js
```js

    var request = require('request');

    var options = {
    url: 'https://horoscopefree.herokuapp.com/daily/',
    method: 'GET'
    };

    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body);
        }
    }

    request(options, callback);
```
