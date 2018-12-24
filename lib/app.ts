import * as express from "express";
import * as bodyParser from "body-parser";
import * as compression from "compression";

import crawler from "./crawler";
import home from "./home";

class App {

    public app: express.Application;

    constructor() {
        this.app = express();
        this.config();        
    }

    private config(): void{
        // support application/json type post data
        this.app.use(bodyParser.json());
        this.app.use(compression());
        //support application/x-www-form-urlencoded post data
        this.app.use(bodyParser.urlencoded({ extended: false }));

        this.app.get('/', (req, res) => {
            home()
                .then( html => {
                    res.status(200).send(html)
                })
        })

        this.app.get('/daily', (req, res) => {
            const language = 'en';
            crawler(language)
                .then( horoscope => res.status(200).send(horoscope))
            
        })

        this.app.get('/daily/:language', (req, res) => {
            const language = req.params.language;
            crawler(language)
                .then( horoscope => res.status(200).send(horoscope))
            
        })
    }

}

export default new App().app;