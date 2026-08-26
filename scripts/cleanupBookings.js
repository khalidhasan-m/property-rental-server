const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './.env' });

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB);
  const coll = db.collection('bookings');

  const duplicates = await coll.aggregate([
    { $match: { bookingStatus: { $in: ['pending', 'approved'] } } },
    { $group: { _id: { propertyId: '$propertyId', moveInDate: '$moveInDate' }, ids: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();

  for (const g of duplicates) {
    const [, ...toDelete] = g.ids;
    if (toDelete.length) {
      await coll.deleteMany({ _id: { $in: toDelete } });
      console.log('Deleted', toDelete.length, 'duplicates for', g._id);
    }
  }

  await client.close();
})();
