const https = require('https');

const API_KEY = "AIzaSyCW5B_PqlQFdSQB70HAlR6IOp796Dhwx0Y";

function listModels() {
    console.log(`\n--- Listing Available Models (REST API) ---`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            if (res.statusCode !== 200) {
                console.error(`❌ HTTP Error: ${res.statusCode} ${res.statusMessage}`);
                console.error(`Response: ${data}`);
                return;
            }
            try {
                const json = JSON.parse(data);
                if (json.models) {
                    console.log("✅ Available Models:");
                    json.models.forEach(m => {
                        console.log(`- ${m.name} (Methods: ${m.supportedGenerationMethods})`);
                    });
                } else {
                    console.log("⚠️ No models found in response:", data);
                }
            } catch (e) {
                console.error("Parse Error:", e.message);
            }
        });
    }).on('error', (e) => {
        console.error(`❌ Network Error:`, e.message);
    });
}

listModels();
