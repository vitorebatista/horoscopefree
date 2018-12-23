
import * as request from 'superagent';
import { JSDOM } from 'jsdom';
import * as moment from 'moment'

// const request = promisifyAgent(agent, Bluebird);
const website = (language, sign) => `http://${language}.horoscopofree.com/${sign}`;
const signs = {
    en: [
        'aries',
        'taurus',
        'gemini',
        'cancer',
        'leo',
        'virgo',
        'libra',
        'scorpio',
        'sagittarius',
        'capricorn',
        'aquarius',
        'pisces'
    ],
    pt: [
        'aries',
        'touro',
        'gemeos',
        'cancer',
        'leao',
        'virgem',
        'libra',
        'escorpiao',
        'sagitario',
        'capricornio',
        'aquario',
        'peixes'
    ],

}

function nodeListToArray(dom) {
    return Array.prototype.slice.call(dom, 0);
}

async function horoscopeCrawler(language) {
    let dateHoroscope = '';
    let horoscope = {
        publish: '',
        language: '',
        aries: '',
        taurus: '',
        gemini: '',
        cancer: '',
        leo: '',
        virgo: '',
        libra: '',
        scorpio: '',
        sagittarius: '',
        capricorn: '',
        aquarius: '',
        pisces: ''
    }
    // Obter todo o HTML do site em modo texto
    const promises = signs[language]
        .map( (sign, index) =>{
            const signRoute = language === 'en' ? `${sign}-horoscope-partner` : `partner-${sign}`;
            return request.get(website(language, signRoute)).then(({ text }) => {
                // Virtualizar o DOM do texto
                const { window } = new JSDOM(text);
                
                // Converter os dados da tabela para uma lista e remover os links
                const horos = nodeListToArray(window.document.querySelectorAll('div.horo'))
                    .map(horo => {
                        const date = horo.querySelectorAll('div .date');
                        
                        dateHoroscope = date[date.length - 1].innerHTML;
                        const description = horo.querySelector('p');
                        horoscope[signs.en[index]] = description.innerHTML;
                        return description.innerHTML;
                    })
                })
                .catch((error) => error);
            
        });

    const results = await Promise.all(promises);
    horoscope.publish = language === 'en'
        ? moment(dateHoroscope, 'MMMM DD, YYYY', 'en')
            .format('YYYY-MM-DDTHH:mm:ss.SSSSZ')
        : moment(dateHoroscope.replace(/ de /g,' '), 'DD MMMM YYYY', 'pt')
            .format('YYYY-MM-DDTHH:mm:ss.SSSSZ');
    horoscope.language = language;
    return horoscope;
}

export default horoscopeCrawler;