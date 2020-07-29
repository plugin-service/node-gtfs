module.exports = {
  filenameBase: 'trips',
  schema: [
    {
      name: 'trip_id',
      type: 'varchar(255)',
      primary: true
    },
    {
      name: 'route_id',
      type: 'varchar(255)',
      required: true
    },
    {
      name: 'service_id',
      type: 'varchar(255)',
      required: true
    },
    {
      name: 'trip_headsign',
      type: 'varchar(255)'
    },
    {
      name: 'trip_short_name',
      type: 'varchar(255)'
    },
    {
      name: 'direction_id',
      type: 'integer',
      min: 0,
      max: 1
    },
    {
      name: 'block_id',
      type: 'varchar(255)'
    },
    {
      name: 'shape_id',
      type: 'varchar(255)'
    },
    {
      name: 'wheelchair_accessible',
      type: 'integer',
      min: 0,
      max: 2
    },
    {
      name: 'bikes_allowed',
      type: 'integer',
      min: 0,
      max: 2
    }
  ]
};
