const dns = require('dns');

// Force use of Google DNS
dns.setServers(['8.8.8.8', '8.8.4.4']);

const shards = [
  'ac-ycxk9sn-shard-00-00.7m1pmkd.mongodb.net',
  'ac-ycxk9sn-shard-00-01.7m1pmkd.mongodb.net',
  'ac-ycxk9sn-shard-00-02.7m1pmkd.mongodb.net'
];

shards.forEach(shard => {
    console.log(`Testing resolution for shard ${shard}...`);
    dns.resolve4(shard, (err, addresses) => {
        if (err) console.error(`Resolution for ${shard} failed: ${err.message}`);
        else console.log(`Resolution for ${shard} success: ${addresses}`);
    });
});
