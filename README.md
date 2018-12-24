<h1 align="center" style="border-bottom: none;">:clock3:	:six_pointed_star: :gemini: horoscopefree</h1>

## Highlights

- Daily horoscope
- [English](https://horoscopefree.herokuapp.com/daily/), [Portuguese](https://horoscopefree.herokuapp.com/daily/pt/) and [Spanish](https://horoscopefree.herokuapp.com/daily/es/) horoscope
- Simple and free HTTP resquest

## What is horoscopefree?
horoscopefree REST API allows developers to access and integrate the functionality of horoscopefree.com with other applications. The API retrieves daily horoscopes.

Feel free to contribute on [Github](http://github.com/vitorebatista/horoscopefree)

## :book: Usage

    GET English: https://horoscopefree.herokuapp.com/daily/
    GET Portuguese: https://horoscopefree.herokuapp.com/daily/pt/
    GET Spanish: https://horoscopefree.herokuapp.com/daily/es/


## :bulb: Examples

### cURL
```cUrl
    curl -X GET \
    'https://horoscopefree.herokuapp.com/daily/'
```

#### Python

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

## 🤝 &nbsp; Contributions

Contributions, issues and feature requests are very welcome.

## 💪🏻 &nbsp; Contributors

This project exists thanks to all the people who contribute. [[Contribute](CONTRIBUTING.md)].


## License

horoscopefree is licensed under a [MIT  License](./LICENSE).