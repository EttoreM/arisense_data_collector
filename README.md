This is the NodeJs progect used to collect data from AriSense air-quality devices.

* arisense.js contains the actual code for data collection. The code iteratively at regular time intervals

*arisense_recover_data.js is used occasionaly to recover data that was not collected due to outaged of the third party data provider, or outages of the serviced that runs arisense.js

* device.txt contains the IDs of the AriSense devices from which arisense.js collects data.

* package-lock.json contains the dependencies that need to be downloaded for the Node project to run


# How to run the node project

After downloading the project on your local machine cd into the project folder and run `npm install`. This will downmload and install all the dependencies as specified in package-lock.json
