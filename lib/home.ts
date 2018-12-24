
import * as request from 'superagent';
import * as showdown from "showdown";

async function home() {
    const converter = new showdown.Converter();
    return request.get('https://raw.githubusercontent.com/vitorebatista/horoscopefree/dev/README.md')
        .then( ({ text }) => {
            console.log(converter.makeHtml(text));
            return converter.makeHtml(text);
        })
        .catch( () => 'err');
}

export default home;