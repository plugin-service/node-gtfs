module.exports = {
  filenameBase: 'fare_rules',
  schema: [
    {
      name: 'id',
      type: 'integer',
      primary: true
    },
    {
      name: 'fare_id',
      type: 'varchar(255)',
      required: true
    },
    {
      name: 'route_id',
      type: 'varchar(255)'
    },
    {
      name: 'origin_id',
      type: 'varchar(255)'
    },
    {
      name: 'destination_id',
      type: 'varchar(255)'
    },
    {
      name: 'contains_id',
      type: 'varchar(255)'
    }
  ]
};
