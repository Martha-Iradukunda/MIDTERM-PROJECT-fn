import { createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../configs/axios';

const collectionThunk = createAsyncThunk(
  'user/collection',
  async (page, { rejectWithValue }) => {
    try {
      const res = await axios.get(
        `/products/collection?limit=10&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      return res.data.allProducts;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export default collectionThunk;
