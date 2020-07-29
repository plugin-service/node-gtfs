module.exports = {
  filenameBase: 'transfers',
  schema: [
    {
      name: 'id',
      type: 'integer',
      primary: true
    },
    {
      name: 'from_stop_id',
      type: 'varchar(255)',
      required: true
    },
    {
      name: 'to_stop_id',
      type: 'varchar(255)',
      required: true
    },
    {
      name: 'transfer_type',
      type: 'integer',
      required: true,
      min: 0,
      max: 3
    },
    {
      name: 'min_transfer_time',
      type: 'integer',
      min: 0
    }
  ]
};
