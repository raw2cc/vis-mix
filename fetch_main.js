import {fetchAllContent} from "./list.js";
import {updateArticles} from "./fetch_article.js";

fetchAllContent()
    .then(() => updateArticles())
    .then(content => console.log(content));


