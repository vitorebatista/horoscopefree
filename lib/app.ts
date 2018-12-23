import * as express from "express";
import * as bodyParser from "body-parser";
import crawler from "./crawler";

class App {

    public app: express.Application;

    constructor() {
        this.app = express();
        this.config();        
    }

    private config(): void{
        // support application/json type post data
        this.app.use(bodyParser.json());
        //support application/x-www-form-urlencoded post data
        this.app.use(bodyParser.urlencoded({ extended: false }));
        this.app.get('/daily/:language', (req, res) => {
            const language = req.params.language;
            crawler(language)
                .then( horoscope => res.status(200).send(horoscope))
            
        })
    }

}

export default new App().app;