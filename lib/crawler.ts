
import * as request from 'superagent';
import { JSDOM } from 'jsdom';
import * as moment from 'moment'

const website = (language: string, sign: string) => {
    const route = {
        en: `${sign}-horoscope-partner`,
        pt: `partner-${sign}`,
        es: `partner-${sign}`
    };
    return `http://${language}.horoscopofree.com/${route[language]}`;
}

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
    es: [
        'aries',
        'tauro',
        'geminis',
        'cancer',
        'leo',
        'virgo',
        'libra',
        'escorpio',
        'sagitario',
        'capricornio',
        'acuario',
        'piscis'
    ],

}

function nodeListToArray(dom: string) {
    return Array.prototype.slice.call(dom, 0);
}

function formatDate( language: string, date: string ) {
    return language === 'en'
    ? moment(date, 'MMMM DD, YYYY', 'en')
        .format('YYYY-MM-DDTHH:mm:ss.SSSSZ')
    : moment(date.replace(/ de /g,' '), 'DD MMMM YYYY', language)
        .format('YYYY-MM-DDTHH:mm:ss.SSSSZ');
}

async function horoscopeCrawler(language: string) {
    let dateHoroscope = '';
    let horoscope = {
        publish: '',
        language,
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
        .map( (sign: string, index: number) =>{
            return request
                .get(website(language, sign))
                .then(({ text }) => {
                    const { window } = new JSDOM(text);
                    nodeListToArray(window.document
                        .querySelectorAll('div.horo'))
                        .map(horo => {
                            const date = horo.querySelectorAll('div .date');
                            
                            dateHoroscope = date[date.length - 1].innerHTML;
                            const description = horo.querySelector('p');
                            horoscope[signs.en[index]] = description.innerHTML;
                            return description.innerHTML;
                        })
                })
                .catch((error: string) => error); 
        });

    await Promise.all(promises);
    horoscope.publish = formatDate( language, dateHoroscope )
    return horoscope;
}

export default horoscopeCrawler;