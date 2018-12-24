
import * as request from 'superagent';
import * as showdown from "showdown";

async function home() {
    const converter = new showdown.Converter();
    return request.get('https://raw.githubusercontent.com/vitorebatista/horoscopefree/master/README.md')
        .then( ({ text }) => {
            return converter.makeHtml(text);
        })
        .catch( () => 'err');
}

export default home;