import { getSupabase, isSupabaseConfigured } from '../config/supabase';
import { Address } from '../types';
import { Insertable, Updateable, DbAddress } from '../types/database';

// Transform DB address to app Address type
// DB columns: address_line_1, address_line_2 → App fields: address, locality
const dbAddressToAppAddress = (dbAddress: any): Address => ({
  id: dbAddress.id,
  name: dbAddress.name,
  phone: dbAddress.phone,
  pincode: dbAddress.pincode,
  address: dbAddress.address_line_1,      // DB: address_line_1 → App: address
  locality: dbAddress.address_line_2 || '', // DB: address_line_2 → App: locality
  city: dbAddress.city,
  state: dbAddress.state,
  isDefault: dbAddress.is_default,
  type: dbAddress.type,
});

// Transform app Address to DB format
// App fields: address, locality → DB columns: address_line_1, address_line_2
const appAddressToDbAddress = (address: Omit<Address, 'id'>): any => ({
  name: address.name,
  phone: address.phone,
  pincode: address.pincode,
  address_line_1: address.address,         // App: address → DB: address_line_1
  address_line_2: address.locality || null, // App: locality → DB: address_line_2
  city: address.city,
  state: address.state,
  is_default: address.isDefault,
  type: address.type,
});

export const addressService = {
  /**
   * Get all addresses for the current user
   */
  async getAddresses(): Promise<{ addresses: Address[]; error?: string }> {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) {
        return { addresses: [], error: 'Not authenticated' };
      }

      const { data, error } = await getSupabase()
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        return { addresses: [], error: error.message };
      }

      return { addresses: (data || []).map(dbAddressToAppAddress) };
    } catch (error) {
      return { addresses: [], error: 'Failed to fetch addresses' };
    }
  },

  /**
   * Add a new address
   */
  async addAddress(address: Omit<Address, 'id'>): Promise<{ address?: Address; error?: string }> {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) {
        return { error: 'Not authenticated' };
      }

      // If this is the default address, unset other defaults
      if (address.isDefault) {
        await getSupabase()
          .from('addresses')
          .update({ is_default: false } as any)
          .eq('user_id', user.id);
      }

      const { data, error } = await getSupabase()
        .from('addresses')
        .insert({
          ...appAddressToDbAddress(address),
          user_id: user.id,
        } as any)
        .select()
        .single();

      if (error || !data) {
        return { error: error?.message || 'Failed to add address' };
      }

      return { address: dbAddressToAppAddress(data) };
    } catch (error) {
      return { error: 'Failed to add address' };
    }
  },

  /**
   * Update an existing address
   */
  async updateAddress(addressId: string, updates: Partial<Address>): Promise<{ address?: Address; error?: string }> {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) {
        return { error: 'Not authenticated' };
      }

      // If setting as default, unset other defaults
      if (updates.isDefault) {
        await getSupabase()
          .from('addresses')
          .update({ is_default: false } as any)
          .eq('user_id', user.id)
          .neq('id', addressId);
      }

      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.pincode !== undefined) dbUpdates.pincode = updates.pincode;
      if (updates.address !== undefined) dbUpdates.address_line_1 = updates.address;   // App: address → DB: address_line_1
      if (updates.locality !== undefined) dbUpdates.address_line_2 = updates.locality; // App: locality → DB: address_line_2
      if (updates.city !== undefined) dbUpdates.city = updates.city;
      if (updates.state !== undefined) dbUpdates.state = updates.state;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.isDefault !== undefined) dbUpdates.is_default = updates.isDefault;

      const { data, error } = await getSupabase()
        .from('addresses')
        .update(dbUpdates as any)
        .eq('id', addressId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error || !data) {
        return { error: error?.message || 'Failed to update address' };
      }

      return { address: dbAddressToAppAddress(data) };
    } catch (error) {
      return { error: 'Failed to update address' };
    }
  },

  /**
   * Delete an address
   */
  async deleteAddress(addressId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { error } = await getSupabase()
        .from('addresses')
        .delete()
        .eq('id', addressId)
        .eq('user_id', user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to delete address' };
    }
  },

  /**
   * Set an address as default
   */
  async setDefaultAddress(addressId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Unset all defaults
      await getSupabase()
        .from('addresses')
        .update({ is_default: false } as any)
        .eq('user_id', user.id);

      // Set new default
      const { error } = await getSupabase()
        .from('addresses')
        .update({ is_default: true } as any)
        .eq('id', addressId)
        .eq('user_id', user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to set default address' };
    }
  },

  /**
   * Get the default address
   */
  async getDefaultAddress(): Promise<{ address?: Address; error?: string }> {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) {
        return { error: 'Not authenticated' };
      }

      const { data, error } = await getSupabase()
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        return { error: error.message };
      }

      if (!data) {
        // Return first address if no default
        const { data: firstAddress } = await getSupabase()
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return { address: firstAddress ? dbAddressToAppAddress(firstAddress) : undefined };
      }

      return { address: dbAddressToAppAddress(data) };
    } catch (error) {
      return { error: 'Failed to fetch default address' };
    }
  },
};
