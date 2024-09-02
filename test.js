const { remote } = require('webdriverio');
const axios = require('axios');
const { exec } = require('child_process');
const geolib = require('geolib');
const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

// URL de l'API
const apiUrl = 'http://127.0.0.1:8000/api/histories/detail';
/**
 * Met à jour les données d'historique via une requête GET.
 * 
 * @param {Object} fields - Les champs à mettre à jour.
 * @param {string} apiURL - L'URL de l'API pour la mise à jour.
 * @returns {Promise<void>}
 */
async function updateHistoryData(fields, apiURL) {
    try {
        // Créer une chaîne de requête à partir des champs
        const queryString = new URLSearchParams(fields).toString();

        // Construire l'URL complète avec les paramètres de requête
        const url = `${apiURL}?${queryString}`;

        // Envoi de la requête GET avec axios
        const response = await axios.get(url);

        // Afficher la réponse en cas de succès
        console.log('Update successful:', response.data);
    } catch (error) {
        // Afficher les détails de l'erreur
        console.error('Error updating history data:', error.response ? error.response.data : error.message);
    }
}
// Fonction pour récupérer les données de l'API
async function fetchDevicesFromApi() {
    try {
        const response = await axios.get(apiUrl);
        const { data } = response.data;

        return data.map(item => {
            const device = item.device || {};
            const customer = item.history.customer || {};

            return {
                deviceName: device.nom || 'Unknown Device',
                udid: device.uuid || 'Unknown UDID',
                keyword: customer.array_key_word || 'Default Keyword',
                agence_name: customer.entreprise || 'Default Agence',
                url: customer.url_gmyb || 'https://www.defaulturl.com',
                phone: device.typephone || 'Not Provided', // Utilisation du typephone comme numéro de téléphone
                status: item.history.status === 1,
                picture: item.history.picture,
                review: item.history.review,
                information: item.history.information,
                call: item.history.call,
                website: item.history.website,
                itineraire: item.history.itineraire,
                urlUdpate: 'http://127.0.0.1:8000/histories/increment-user-history/' + customer.id + '/'

                // Convertir le statut 1 à true
            };
        });
    } catch (error) {
        console.error('Error fetching devices from API:', error.message);
        return [];
    }
}


const baseCapabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:browserName': 'Chrome',
    'appium:autoAcceptAlerts': 'true',
    'appium:autoGrantPermissions': 'true'

};

const wdOpts = {
    hostname: process.env.APPIUM_HOST || 'localhost',
    port: parseInt(process.env.APPIUM_PORT, 10) || 4723,
    logLevel: 'info',
};

const selectors = {
    overview: '//a[@role="tab"]//span[text()="Aperçu"]',
    services: '//a[@role="tab"]//span[text()="Services"]',
    reviews: '//a[@role="tab"]//span[text()="Avis"]',
    images: '//a[@role="tab"]//span[text()="Photos"]',
    about: '//a[@role="tab"]//span[text()="À propos"]'

};

// Function to click on a tab
async function clickTab(driver, tabSelector) {
    const tab = await driver.$(tabSelector); // Sélectionne l'élément avec le sélecteur

    const isTabExisting = await tab.isExisting(); // Vérifie si l'élément existe
    if (isTabExisting) {
        await tab.click(); // Clique sur l'élément s'il existe
        await driver.pause(2000); // Attends 2 secondes pour que le contenu se charge
    } else {
        console.log(`Tab with selector ${tabSelector} does not exist.`);
    }
}
async function getRandomPosition(latitude, longitude, maxDistance) {
    // Rayon de la Terre en mètres
    const earthRadius = 6371000; // en mètres

    // Convertir la distance maximale en radians
    const maxDistanceInRadians = maxDistance / earthRadius;

    // Générer un angle aléatoire en radians
    const randomAngle = Math.random() * 2 * Math.PI;

    // Calculer les coordonnées aléatoires
    const newLatitude = latitude + (Math.sin(randomAngle) * maxDistanceInRadians * (180 / Math.PI));
    const newLongitude = longitude + (Math.cos(randomAngle) * maxDistanceInRadians * (180 / Math.PI) / Math.cos(latitude * Math.PI / 180));

    return { latitude: newLatitude, longitude: newLongitude };
}

async function runADBCommand(longitude, latitude) {
    const command = `adb shell am start-foreground-service --user 0 -n io.appium.settings/.LocationService --es longitude ${longitude} --es latitude ${latitude}`;
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Erreur lors de l'exécution de la commande ADB: ${error}`);
            return;
        }
        console.log(`Commande ADB exécutée avec succès: ${stdout}`);
    });
}
const execShellCommand = (cmd) => {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                reject(`Error: ${stderr}`);
                return;
            }
            resolve(stdout);
        });
    });
};
// Bonjour je cherche 2 pieces ou 3 pieces  dans la zone de angre chateu ou abobo baoule, belleville
// Budget   120.000  CFA

// Fonction de recherche Google
async function searchOnGoogle(driver, keyword, agence_name, url, phone, picture,
    review,
    information,
    call,
    website,
    itineraire, urlUdpate) {
    try {
        // await updateHistoryData({
        //     picture: 0,
        //     review: 1,
        //     information: 0,
        //     call: 0,
        //     website: 0,
        //     itineraire: 0,
        //     status: 0,
           
        // },  urlUdpate);

        await driver.url(' https://www.google.fr');
        const searchBox = await driver.$('textarea[name="q"]');
        console.log('Entering search term...');
        await searchBox.setValue(keyword);

        await driver.keys('Enter');
        await driver.pause(3000);

        await moreCompagnyFunction(driver,agence_name);


        await driver.pause(5000);

        const rand = Math.random();
        const tabReviews = await driver.$('//a[@role="tab"]//span[text()="Avis"]');
        const istabReviewsExisting = await tabReviews.isExisting();
        if (istabReviewsExisting) {
            await updateHistoryData({
                review: 1,
          
               
            },  urlUdpate);
            await tabReviews.click();
            await driver.pause(2000);

            await driver.execute(() => {
                window.scrollBy(0, 500);
            });

            await driver.pause(1000); // Attendre 1 seconde

            // Scroller vers le haut
            await driver.execute(() => {
                window.scrollBy(0, -500);
            });
            await driver.pause(5000);
        } else {
            console.log(`Tab with selector ${tabSelector} does not exist.`);
        }

        if (rand < 0.7) {
            if (picture)
                await clickTab(driver, selectors.images); // 70% chance to consult images
            await updateHistoryData({
                picture: 1,
           
                
            },urlUdpate);
        } else if (rand < 0.7 + 0.3) {
            if (information)
                await clickTab(driver, selectors.services); // 30% chance to consult services
            await updateHistoryData({
          
                information: 1,
             
                
            },urlUdpate);
        } else {
            await clickTab(driver, selectors.about);
            await updateHistoryData({
            
                information: 1,
                
                
            }),urlUdpate;// Fallback for other cases
        }


        await clickTab(driver, selectors.overview); // Fallback for other cases
        await driver.pause(5000);
        if (website)
            await siteWebFunction(driver);
        await driver.pause(5000);

        await Callfunction(driver);
        await driver.pause(5000);

        await goItineraireFunction(driver);
        await driver.pause(15000);
        // Attendre que l'alerte soit présente



        await handleModal(driver);
        await driver.pause(5000);

        const destinationDetails = await getDestinationDetails(driver);

        if (destinationDetails) {
            // Récupération des coordonnées dans des variables distinctes
            const maxDistance = 1000;
            const { latitude, longitude } = destinationDetails;
            const newPosition = await getRandomPosition(latitude, longitude, maxDistance);








            // Utilisation des variables
            console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
            console.log(`newpos: ${newPosition.latitude} ${newPosition.longitude}`);
            await driver.pause(5000);

            const inputField = await driver.$('#ml-waypoint-input-0');

            // Vérifier si l'input existe
            if (await inputField.isExisting()) {
                // Cliquer sur l'input
                await inputField.click();

                // Effacer le texte existant (si nécessaire)
                await inputField.clearValue();
                await driver.pause(5000);

                // Entrer le texte dans l'input
                const limitedLatitude = newPosition.latitude.toFixed(6);
                const limitedLongitude = newPosition.longitude.toFixed(6);

                // Insérer les valeurs dans le champ de saisie
                await inputField.setValue(`${limitedLatitude},${limitedLongitude}`);
                await driver.pause(5000);

                await driver.keys('Enter');

                await driver.pause(15000);
                await runADBCommand(limitedLongitude, limitedLatitude);
                const startLatitude = limitedLatitude; // Latitude de départ
                const startLongitude = limitedLongitude; // Longitude de départ
                const endLatitude = latitude; // Latitude d'arrivée
                const endLongitude = longitude; // Longitude d'arrivée
                const numPoints = 30; // Nombre de points intermédiaires

                const startPoint = limitedLongitude + ',' + limitedLatitude; // Point de départ
                const endPoint = longitude + ',' + latitude; // Point d'arrivée
                const accessToken = 'pk.eyJ1IjoiZmZzY2giLCJhIjoiY20wN3VyN2tuMDJ4ZzJxc2J1azYzOTg1MSJ9.r20psHXcWEEgeJBx-99OFg';




                await driver.pause(5000);

                // Exemple d'utilisation


                // Générer les étapes intermédiaires en ligne droite

                // Simuler le déplacement

                const navButtonSelector = 'button[aria-label="Utiliser la navigation dans l\'application"]';
                // const startButtonXPath = '//button[@aria-label="Démarrer" and contains(@class, "BXErWc Uv8bJd")]';

                // Chercher le bouton "Utiliser la navigation dans l'application"
                const navButton = await driver.$(navButtonSelector);

                if (await navButton.isExisting() && await navButton.isDisplayed()) {
                    // Cliquer sur le bouton "Utiliser la navigation dans l'application"
                    await navButton.click();
                    console.log('Clicked on "Utiliser la navigation dans l\'application".');
                } else {
                    // Si le bouton n'est pas trouvé ou visible, chercher et cliquer sur le bouton "Démarrer"
                    // Localisez le bouton "Démarrer"
                    let startButton = await driver.$('button[aria-label="Démarrer"]');


                    await driver.pause(1000);

                    // Essayez de cliquer sur l'élément
                    await startButton.click();

                }
                await driver.pause(15000);
        // const startPoint = '-74.13807,40.767045'; // Point de départ
        // const endPoint = '-74.290976,40.826347'; // Point d'arrivée
        // const accessToken = 'pk.eyJ1IjoiZmZzY2giLCJhIjoiY20wN3VyN2tuMDJ4ZzJxc2J1azYzOTg1MSJ9.r20psHXcWEEgeJBx-99OFg';
        
                await getRouteWithWalkingSpeed(startPoint, endPoint, accessToken)
                    .then(routeData => {
                        const steps = routeData.routes[0].legs[0].steps;
                        simulateMovement(steps);

                    })
                    .catch(error => {
                        console.error('Failed to get route:', error);
                    });

                await driver.pause(15000);

                console.log(`Texte inséré : `);
            } else {
                console.error("L'input n'a pas été trouvé.");
            }
            await driver.pause(200000);
            await    updateHistoryData({
                picture: 1,
                review: 1,
                information: 1,
                call: 1,
                website: 1,
                itineraire: 1,
                status: 1,
               
            },urlUdpate);
            // await driver.closeApp();
            console.log('Google Maps closed successfully');

        } else {
            console.error('Erreur: Impossible de récupérer les coordonnées.');
        } await driver.pause(5000);






        await driver.pause(1000);
    } catch (error) {
        console.error(`Erreur dans la fonction searchOnGoogle: ${error.message}`);
    }
}

function calculateWalkingSpeed(distance, maxDuration = 3000) {
    const speed = distance / maxDuration;
    return Math.min(Math.max(speed, 0.14), 6.94); // Limiter la vitesse entre 0.14 m/s et 6.94 m/s
}

// Fonction pour obtenir l'itinéraire entre deux points avec une vitesse de marche ajustée
async function getRouteWithWalkingSpeed(start, end, accessToken) {
    const distance = 399.027; // Distance totale du trajet en mètres
    const walkingSpeed = calculateWalkingSpeed(distance); // Calculer la vitesse de marche

    const baseUrl = 'https://api.mapbox.com/directions/v5/mapbox/walking/';
    const params = new URLSearchParams({
        alternatives: 'true',
        geometries: 'geojson',
        overview: 'full',
        steps: 'true',
        access_token: accessToken,
        walking_speed: walkingSpeed // Utiliser la vitesse de marche calculée
    });

    try {
        const response = await axios.get(`${baseUrl}${start};${end}?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching route:', error);
        throw error;
    }
}

// Fonction pour simuler le déplacement en utilisant les points de manœuvre, de géométrie et les intersections
async function simulateMovement(steps) {
    const maxSimulationTime = 300000; // Durée maximale de 5 minutes en millisecondes
    const totalSteps = steps.length;
    const timePerStep = Math.floor(maxSimulationTime / totalSteps); // Temps alloué par étape

    let index = 0;

    const intervalId = setInterval(() => {
        if (index >= steps.length) {
            clearInterval(intervalId);
            console.log('Déplacement terminé.');
            return;
        }

        const step = steps[index];

        // Extraire les coordonnées du point de manœuvre, du dernier point de la géométrie, et des intersections
        const maneuverLocation = step.maneuver.location;
        const geometryLocation = step.geometry.coordinates[step.geometry.coordinates.length - 1];
        const intersections = step.intersections;

        // Parcourir chaque intersection et vérifier les coordonnées
        intersections.forEach((intersection, i) => {
            const intersectionLocation = intersection.location;

            // Comparer les coordonnées pour s'assurer du déplacement correct
            if (maneuverLocation[0] === intersectionLocation[0] && maneuverLocation[1] === intersectionLocation[1]) {
                updateLocation(maneuverLocation[1], maneuverLocation[0]);
            } else if (geometryLocation[0] === intersectionLocation[0] && geometryLocation[1] === intersectionLocation[1]) {
                updateLocation(geometryLocation[1], geometryLocation[0]);
            } else {
                // Si l'intersection est différente, s'y rendre d'abord
                updateLocation(intersectionLocation[1], intersectionLocation[0]);
            }
        });

        // Si le point de manœuvre n'est pas identique au dernier point de géométrie, s'y rendre ensuite
        if (maneuverLocation[0] !== geometryLocation[0] || maneuverLocation[1] !== geometryLocation[1]) {
            updateLocation(maneuverLocation[1], maneuverLocation[0]);
            updateLocation(geometryLocation[1], geometryLocation[0]);
        }

        index++;
    }, timePerStep); // Intervalle ajusté pour limiter la durée totale à 5 minutes
}


// Fonction pour mettre à jour la position avec ADB
function updateLocation(latitude, longitude) {
    console.log(`Déplacement vers: Latitude ${latitude}, Longitude ${longitude}`);

    const command = `adb shell am start-foreground-service --user 0 -n io.appium.settings/.LocationService --es longitude ${longitude} --es latitude ${latitude}`;
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Erreur lors de l'exécution de la commande ADB: ${error}`);
            return;
        }
        console.log(`Commande ADB exécutée avec succès: ${stdout}`);
    });
}

async function goItineraireFunction(driver) {
    const itineraireButton = await driver.$('div.P6Deab[role="link"]');

    await driver.waitUntil(
        async () => {
            const isDisplayed = await itineraireButton.isDisplayed();
            const isClickable = await itineraireButton.isClickable();
            return isDisplayed && isClickable;
        },
        {
            timeout: 10000, // Timeout en millisecondes
            timeoutMsg: 'Le bouton "Itinéraire" n\'est pas cliquable dans le délai imparti'
        }
    );

    // Cliquez sur le bouton "Itinéraire"
    await itineraireButton.click();
}

async function handleModal(driver) {
    try {
        // Attendre que le modal soit visible
        const modalSelector = 'div.gZdUGf';
        const modalElement = await driver.$(modalSelector);

        await driver.waitUntil(
            async () => await modalElement.isDisplayed(),
            {
                timeout: 10000, // Timeout en millisecondes
                timeoutMsg: 'Le modal n\'est pas visible dans le délai imparti'
            }
        );

        console.log('Modal détecté et visible.');

        // Trouver le bouton "Rester sur le Web" et cliquer dessus
        const stayOnWebButtonSelector = 'span.i4qqBb button.vrdm1c';
        const stayOnWebButton = await driver.$(stayOnWebButtonSelector);

        await driver.waitUntil(
            async () => (await stayOnWebButton.isDisplayed()) && (await stayOnWebButton.isClickable()),
            {
                timeout: 10000, // Timeout en millisecondes
                timeoutMsg: 'Le bouton "Rester sur le Web" n\'est pas cliquable dans le délai imparti'
            }
        );

        console.log('Cliquer sur le bouton "Rester sur le Web".');
        await stayOnWebButton.click();

        // Attendre que la page soit complètement chargée après avoir cliqué sur le bouton
        await driver.pause(5000);

        const element = await driver.$('//input[@id="SIu3L" and @name="travel-mode" and @value="walk"]');

        // Assurez-vous que l'élément est chargé avant d'essayer de cliquer dessus
        await element.waitForDisplayed({ timeout: 5000 });

        // Cliquez sur l'élément
        await element.click();

    } catch (error) {
        console.error(`Erreur lors de la gestion du modal : ${error.message}`);
    }
}


async function moreCompagnyFunction(driver,agence_name) {
    const link = await driver.$('//a[.//span[text()="Plus d\'entreprises"]]');
    await link.waitForExist({ timeout: 30000 });
    console.log('Scrolling to the link...');
    await driver.execute('arguments[0].scrollIntoView({ behavior: "smooth", block: "center" });', link);

    console.log('Waiting for the link to be visible and clickable...');
    await link.waitForDisplayed({ timeout: 30000 });
    await link.waitForEnabled({ timeout: 30000 });

    console.log("Clicking the link 'Plus d'entreprises'...");
    await link.click();

    let twinsFound = false;
    let attempts = 0;
    const maxAttempts = 5; // Limite de 15 répétitions

    while (!twinsFound && attempts < maxAttempts) {

        // Rechercher l'élément "TWINS IMMOBILIER" dans la liste des résultats
        const twinsLink = await driver.$('//span[contains(text(), "TWINS IMMOBILIER")]');
        const link = await driver.$(`//div[text()="${agence_name}"]`);

        // Vérifiez si l'élément existe avant de cliquer
        const isExisting = await link.isExisting();
        if (isExisting) {
            await link.click();
            await driver.pause(10000);

            console.log(`L'élément "${agence_name}" a été cliqué avec succès !`);
        } else {
            console.log(`L'élément "${agence_name}" n'a pas été trouvé.`);
        }
        
        if (await twinsLink.isDisplayed()) {
            twinsFound = true;
            await twinsLink.click();
            await driver.pause(10000);
        } else {
            // Faire défiler la page
            try {
               
                const loadMoreButton = await driver.$('//a[contains(@class, "T7sFge") and contains(@aria-label, "Autres résultats de recherche")]');
                if (await loadMoreButton.isDisplayed()) {
                    await loadMoreButton.click(); // Cliquer sur "Autres résultats de recherche"
                    await driver.getUrl();
                    await driver.pause(3000); // Attendre le chargement des nouveaux résultats
                    continue; // Retourner au début de la boucle pour vérifier les nouveaux résultats
                }
            } catch (error) {
                // Si le bouton n'est pas trouvé, continuer à défiler
                
                await driver.execute('window.scrollBy(0, 500)');
                await driver.pause(1000); // Pause pour permettre le chargement
            }
        }
        attempts++; // Incrémenter le compteur de tentatives
        if (attempts > maxAttempts && !twinsFound) {
            await driver.deleteSession();
            console.log("Session fermée.");
        }
    }

    if (!twinsFound) {
        console.log("TWINS IMMOBILIER n'a pas été trouvé après 15 tentatives.");
    }

    // Fermer la session

}


async function siteWebFunction(driver) {
    const siteWebButton = await driver.$('a=Site Web');


    // Cliquez sur le bouton
    await driver.waitUntil(
        async () => {
            const isDisplayed = await siteWebButton.isDisplayed();
            const isClickable = await siteWebButton.isClickable();
            return isDisplayed && isClickable;
        },
        {
            timeout: 10000, // Timeout en millisecondes
            timeoutMsg: 'Le bouton "Site Web" n\'est pas cliquable dans le délai imparti'
        }
    );

    // Faites défiler l'élément dans la vue
    await driver.pause(1000); // Petite pause pour s'assurer que l'élément est visible
    await siteWebButton.click();

    // Essayez de cliquer en utilisant JavaScript pour forcer le clic
    // Find the element using XPath (adjust the XPath as needed)
    await driver.pause(5000);
    await driver.execute('window.scrollBy(0, 500)');
    await driver.pause(5000);

    await driver.back();

    await driver.pause(5000);
}

async function reviewfunction(driver) {

    var currentUrl = await driver.getUrl();

    const selector = 'a=Autres avis Google';

    // Trouvez l'élément
    const element = await driver.$(selector);

    // Faites défiler l'élément dans la vue s'il n'est pas visible
    // Attendez que l'élément soit cliquable
    await driver.waitUntil(
        async () => (await element.isDisplayed()) && (await element.isClickable()),
        {
            timeout: 10000, // Timeout en millisecondes
            timeoutMsg: 'L\'élément avec jsaction="trigger.i2Tjcd" n\'était pas cliquable dans le délai imparti'
        }
    );

    // Cliquez sur l'élément
    await element.click();


    await driver.pause(10000);

    const selectorPLus = '//span[text()="Les plus récents"]/ancestor::div[@aria-checked="false"]';
    const elementPlus = await driver.$(selectorPLus);

    // Assurez-vous que l'élément est visible
    await driver.waitUntil(async () => await elementPlus.isDisplayed(), {
        timeout: 5000,
        timeoutMsg: 'L\'élément avec le texte "Les plus récents" n\'est pas visible'
    });

    await driver.pause(10000);

    await driver.url(currentUrl);

    // Scroll into view avec pause pour une animation fluide
}


async function Callfunction(driver) {
    var currentUrl = await driver.getUrl();

    await driver.pause(10000);

    const callButton = await driver.$('a[aria-label="Appeler"]');

    // Assurez-vous que l'élément est visible
    await driver.waitUntil(
        async () => await callButton.isDisplayed(),
        {
            timeout: 10000, // Timeout en millisecondes
            timeoutMsg: 'Le bouton "Appeler" n\'est pas visible dans le délai imparti'
        }
    );
    await callButton.click();
    await driver.pause(10000);
    switchToChromeAndNavigate(driver, currentUrl);

    // // Revenir au contexte Chrome
    // const contexts = await driver.getContexts(); // Récupérer tous les contextes disponibles
    // const chromeContext = contexts.find(context => context.includes("CHROMIUM")); // Trouver le contexte CHROMIUM
    // if (chromeContext) {
    //     await driver.switchContext(chromeContext);
    //     await driver.url(currentUrl); // Basculer vers le contexte Chrome
    //     console.log("Revenu au contexte Chrome.");
    //     console.log("L'URL actuelle dans Chrome est : " + currentUrl);

    // } else {
    //     console.error("Le contexte CHROMIUM n'a pas été trouvé !");
    // }

}


async function switchToChromeAndNavigate(driver, currentUrl) {
    try {
        // Pause to ensure the app is ready for interaction
        await driver.pause(10000);

        // Start Chrome using adb
        await new Promise((resolve, reject) => {
            exec('adb shell am start -n com.android.chrome/com.google.android.apps.chrome.Main', (error, stdout, stderr) => {
                if (error) {
                    reject(`Error starting Chrome: ${error.message}`);
                    return;
                }
                if (stderr) {
                    console.error(`stderr: ${stderr}`);
                    return;
                }
                console.log(`stdout: ${stdout}`);
                resolve();
            });
        });

        // Pause to ensure Chrome is ready
        await driver.pause(10000);

        // Navigate to the desired URL in Chrome
        await driver.url(currentUrl);

        console.log("Navigated to URL in Chrome.");
    } catch (error) {
        console.error(`Error in switchToChromeAndNavigate: ${error.message}`);
    }
}

async function getDestinationDetails(driver) {
    try {
        // Récupérer l'URL actuelle
        const currentUrl = await driver.getUrl();
        console.log('Current URL:', currentUrl);

        // Extraire les paramètres de l'URL
        const urlParams = new URLSearchParams(currentUrl.split('@')[1]);
        const coordinates = currentUrl.split('@')[1].split('/')[0].split(',');

        if (coordinates.length >= 2) {
            const latitude = parseFloat(coordinates[0]);
            const longitude = parseFloat(coordinates[1]);

            console.log(`7Extracted Coordinates - Latitude: ${latitude}, Longitude: ${longitude}`);

            // Extraire l'adresse si elle est présente dans l'URL


            return { latitude, longitude };
        } else {
            console.error('Error: Could not extract coordinates from the URL');
            return null;
        }
    } catch (error) {
        console.error('Error extracting destination details:', error.message);
        return null;
    }
}


// Fonction de recherche Google Maps
async function searchOnGoogleMaps(driver, keyword, agence_name, url, phone) {
    try {
        console.log('Navigating to Google Maps...');
        await driver.url('https://www.google.com/maps');
        await driver.pause(3000);

        // Ajouter ici le reste du code pour rechercher sur Google Maps...
    } catch (error) {
        console.error(`Erreur dans la fonction searchOnGoogleMaps: ${error.message}`);
    }
}

// Fonction pour exécuter un test sur un appareil spécifique
async function runTestOnDevice(device) {
    const { deviceName, udid, keyword, agence_name, url, phone, status, picture,
        review,
        information,
        call,
        website,
        itineraire, urlUdpate
    } = device;
    // const picture,
    // const review,
    // const information,
    // const call,
    // const website,
    // const itineraire,
    // Vérification du statut avant de lancer le test
    if (status) {
        console.log(`Skipping device ${deviceName} because status is false.`);
        return;
    }

    const capabilities = {
        ...baseCapabilities,
        'appium:deviceName': deviceName,
        'appium:udid': udid,
    };

    const driver = await remote({
        ...wdOpts,
        capabilities,
    });

    try {

        if (false) {
            await searchOnGoogleMaps(driver, keyword, agence_name, url, phone,);
        } else {
            await searchOnGoogle(driver, keyword, agence_name, url, phone, picture,
                review,
                information,
                call,
                website,
                itineraire, urlUdpate);
        }
    } catch (error) {
        console.error(`Test failed on ${deviceName}:`, error);
    } finally {
        console.log(`Ending session for ${deviceName}`);
        await driver.deleteSession();
        // runTests().catch(console.error);

    }
}

// Fonction pour exécuter les tests en continu
async function runTests() {
    while (true) {
        try {
            const devices = await fetchDevicesFromApi(); // Charger les appareils depuis l'API
            console.log('Devices loaded:', devices);

            await Promise.all(devices.map(device => runTestOnDevice(device)));
            console.log('All devices processed, waiting before the next cycle...');
        } catch (error) {
            console.error('Error during test cycle:', error.message);
        }

        await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 3 minutes avant de vérifier à nouveau
    }
}
// runTests().catch(console.error);
// module.exports = { runTests };
// Route pour exécuter la fonction
app.get('/run-tests', (req, res) => {

    runTests().catch(err => console.error('Error starting tests:', err.message));

    res.sendFile(path.join(__dirname, 'loader.html'));
});

// Démarrer le serveur
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});