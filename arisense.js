
const Influx = require('influx')
const axios = require("axios")
const fs = require('fs')

const n_snapshots = 15

const fileContent = fs.readFileSync('devices.txt', 'utf-8')
const devices = fileContent.split(/\r?\n/).map(line => line)

const url_pref = `https://api.quant-aq.com/device-api/v1/devices/`;

const config = {
	headers: {
		Authorization: "Basic RlZWN1QyUTZJMUNYSlQxNlhWVFBDQUczOg==",
	},
};

observables = {
  'co' : 'co-mass-concentration',
  'co2': 'co2-mass-concentration',
  'no': 'no-mass-concentration',
  'no2': 'no2-mass-concentration',
  'o3': 'o3-mass-concentration',
  'pm1': 'pm1-mass-concentration',
  'pm10': 'pm10-mass-concentration',
  'pm25': 'pm2p5-mass-concentration',
  'pressure': 'air-pressure',
  'rh_manifold': 'relative-humidity',
	'rh': 'relative-humidity',
  // 'solar': 'solar-radiation',
  'temp_manifold': 'air-temperature',
	'temp': 'air-temperature',
  // 'temp_box',
  // 'noise'
  'wind_dir': 'wind-direction',
  'wind_speed':'wind-speed',
	'wd': 'wind-direction',
  'ws':'wind-speed'
}


getAndPostValues = async () => {

	const now = new Date()
	const date1 = new Date(new Date().setDate(now.getDate() - 1))
	const date2 = new Date(new Date(new Date().setDate(date1.getDate())).setHours(date1.getHours()-1))
	const start_ts = date2.toISOString().slice(0,19).replace("T","%20")
	const end_ts   = date1.toISOString().slice(0,19).replace("T","%20")

	for (page in [1]) {
		const url_suff = `/data/?page=${Number(page)+1}&per_page=${n_snapshots}&filter=timestamp,ge,${start_ts};timestamp,le,${end_ts};`;
		// For each device...
		for (i in devices) {

		  // Get the last 'n_snapshots'
		  let data = null
		  try {
		    const res = await axios.get(url_pref+devices[i]+url_suff, config)
		    data = res.data.data
		  }
		  catch(e) {
				console.log(`Unable to get data for device ${devices[i]} - ${e.message}`)
		    continue
		  }
		  
		  // For each data snapshot
		  for (j in data) {

		    // ...extract the time stamp and...
		    const dateTime = data[j]['timestamp'] + '.000Z'
		    const timestamp = Date.parse(dateTime);

		    // ...extract useful info from tiemstamp
		    const timestampObj = new Date(timestamp);
		    const year = parseInt(timestampObj.getFullYear());
		    const month = parseInt(timestampObj.getMonth()) + 1;
		    const day = parseInt(timestampObj.getDate());
		    const hours = parseInt(timestampObj.getHours());
		    const minutes = parseInt(timestampObj.getMinutes());
		    const seconds = parseInt(timestampObj.getSeconds());
		    const weekday = parseInt(timestampObj.getDay());

		    // For each observable in that timestamped snapshot...
		    for (obs in data[j]){
		      if (obs in observables) {

		        // If there is a reading associated with it, then
		        // prepare the datapoint to be posted to InfluxDB and....
		        if (data[j][obs]) {
		          const measurement = observables[obs]
		          const value = Number(data[j][obs])
		          const ref = `arisense__${devices[i]}__${observables[obs]}`
		          const newValue = {
		            measurement,
		            tags: { ref },
		            fields: {
		              value,
		              year,
		              month,
		              day,
		              hours,
		              minutes,
		              seconds,
		              weekday
		            },
		            timestamp: timestamp / 1000
		          }

							// console.log(newValue)

		          // ... post it to InfluxDB
		          try{
		            await influx.writePoints([
		              newValue
		            ], {precision: 's'})
								// console.log(`saved ${newValue.measurement} --> ${newValue.tags.ref}`)
		          } catch (e) {
		            console.log(`ERROR ==> ${e.message}`)
		          }

		        }
					}





					// If there is a reading associated with it, then
	        // prepare the datapoint to be posted to InfluxDB and....
	        if (obs == 'met') {
					// console.log(`I'm here`)
						for (met in data[j][obs]) {
							if (met in observables) {
					      const measurement = observables[met]
					      const value = Number(data[j][obs][met])
					      const ref = `arisense__${devices[i]}__${observables[met]}`
					      const newValue = {
					        measurement,
					        tags: { ref },
					        fields: {
					          value,
					          year,
					          month,
					          day,
					          hours,
					          minutes,
					          seconds,
					          weekday
					        },
					        timestamp: timestamp / 1000
					      }

								// console.log(newValue)

					      // ... post it to InfluxDB
					      try{
					        await influx.writePoints([
					          newValue
					        ], {precision: 's'})
									// console.log(`saved ${newValue.measurement} --> ${newValue.tags.ref}`)
					      } catch (e) {
					        console.log(`ERROR ==> ${e.message}`)
					      }

					    }
						}


		      }
		    }
		  }
			console.log(`Done with sensor ${devices[i]}`)
		}
  }
}


//--------------------------------------------------

const influx = new Influx.InfluxDB({
  host: '172.31.6.188:8086',  // AWS internal address of muo-archive
  // host: '10.99.110.194:8086', // on-Premise (UoM)     
  database: 'mcri'
});

influx.getDatabaseNames()
.then(names => {
  if (!names.includes('mcri')) {
    console.log(`I'm gonna create the DB mrci`);
    return influx.createDatabase('mcri');
  }
  return console.log(`Found database 'mcri' in InfluxDB`);
})
.catch(error => console.log({ error }));

getAndPostValues()
setInterval(getAndPostValues, 600*1000)
