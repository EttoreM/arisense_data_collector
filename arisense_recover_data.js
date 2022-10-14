const Influx = require('influx');
const axios = require("axios");


//------------- GLOBAL VARIABLES -------------


let st = new Date(`17 Jun 2022 00:00:00`) 
let et = new Date(`17 Jun 2022 01:00:00`) 


const n_snapshots = 100

// const devices = ["SN000-098", "SN000-102", "SN000-108", "SN000-117"];
const devices = [
	/*"SN000-089",
	"SN000-098",
	"SN000-099",
	"SN000-100",
	"SN000-117",
	"SN000-120",
	"SN000-096",
	"MOD-00037",
	"MOD-00038",
	"MOD-PM-00445",
	"MOD-PM-00427",
	"MOD-PM-00431",
	"MOD-PM-00435", 

	"MOD-PM-00051",
	"MOD-PM-00052",
	"MOD-PM-00054",
	"MOD-PM-00056",
	"MOD-PM-00058",
	"MOD-PM-00096",
	"MOD-PM-00097",

	"MOD-PM-00449",
	"MOD-PM-00344",
	"MOD-PM-00346",
	"MOD-PM-00347"
	"MOD-PM-00451",
	"MOD-PM-00345",
	"MOD-PM-00448",
	"MOD-PM-00452"
	"MOD-PM-00430",*/
	"MOD-00044",
	"MOD-00042",
	"MOD-PM-00428"
];

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


getAndPostValues = async (start_ts, end_ts) => {

	for (page in [1,2]) {
		
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
				console.log(e.message)
		    return
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
					// console.log(obs)
		      if (obs in observables) {
						// console.log(obs)

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
								if (met === 'pressure' & (value > 1100)) {
										console.log(`pressure: ${Number(data[j][obs][met])} - device: ${devices[i]}`)
								}
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
			// console.log(`Done with sensor ${devices[i]}`)
		}
  }
}

 
main = async () => {
// 	while(st < new Date()) {
	while(st < new Date(new Date().setDate(new Date().getDate() -1))) {

		const start_ts = st.toISOString().slice(0,19).replace("T","%20")
		const end_ts   = et.toISOString().slice(0,19).replace("T","%20")

		console.log(start_ts)
		console.log(end_ts)

		await getAndPostValues(start_ts, end_ts)

		et.setHours(et.getHours() + 1);
		st.setHours(st.getHours() + 1);
	}
	console.log(`\nLast call finished on ${new Date()}\n\n`)
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

main()
