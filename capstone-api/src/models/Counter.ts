import mongoose, { Model, Schema } from 'mongoose';

interface Counter {
  _id: string;
  seq: number;
}

type CounterModel = Model<Counter>;

const counterSchema = new Schema<Counter, CounterModel>(
  {
    _id: {
      type: String,
      required: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  {
    versionKey: false,
  }
);

const CounterModel =
  (mongoose.models.Counter as CounterModel | undefined) ||
  mongoose.model<Counter, CounterModel>('Counter', counterSchema);

export default CounterModel;
