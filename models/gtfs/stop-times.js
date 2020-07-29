module.exports = {
  filenameBase: 'stop_times',
  schema: [
    {
      name: 'id',
      type: 'integer',
      primary: true
    },
    {
      name: 'trip_id',
      type: 'varchar(255)',
      required: true
    },
    {
      name: 'arrival_time',
      type: 'varchar(255)'
    },
    {
      name: 'arrival_timestamp',
      type: 'integer'
    },
    {
      name: 'departure_time',
      type: 'varchar(255)'
    },
    {
      name: 'departure_timestamp',
      type: 'integer'
    },
    {
      name: 'stop_id',
      type: 'varchar(255)',
      required: true
    },
    {
      name: 'stop_sequence',
      type: 'integer',
      required: true,
      min: 0
    },
    {
      name: 'stop_headsign',
      type: 'varchar(255)'
    },
    {
      name: 'pickup_type',
      type: 'integer',
      min: 0,
      max: 3
    },
    {
      name: 'drop_off_type',
      type: 'integer',
      min: 0,
      max: 3
    },
    {
      name: 'shape_dist_traveled',
      type: 'real',
      min: 0
    },
    {
      name: 'timepoint',
      type: 'integer',
      min: 0,
      max: 3
    }
  ]
};
