async function runTest() {
  try {
    // 1. Customer Login
    const loginCust = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer1@travel.com', password: 'Customer@123' })
    });
    const { token: custToken } = await loginCust.json();
    console.log('Customer logged in');

    // 2. Customer places an order (Cash payment)
    const createBooking = await fetch('http://localhost:5000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${custToken}` },
      body: JSON.stringify({
        tour_id: 1,
        departure_date: '2026-06-01',
        adults: 2,
        children: 1,
        customer_info: [
          { type: 'adult', fullName: 'John Doe', phone: '0123456789', age: 30 },
          { type: 'adult', fullName: 'Jane Doe', phone: '', age: 28 },
          { type: 'child', fullName: 'Baby Doe', phone: '', age: 5 }
        ],
        payment_method: 'cash'
      })
    });
    const bookingRes = await createBooking.json();
    const newBookingId = bookingRes.data.id;
    console.log(`Customer placed booking #${newBookingId} successfully! Status: pending`);

    // 3. Admin Login
    const loginAdmin = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@travel.com', password: 'Admin@456' })
    });
    const { token: adminToken } = await loginAdmin.json();
    console.log('Admin logged in');

    // 4. Admin confirms the booking (changes to paid)
    await fetch(`http://localhost:5000/api/bookings/${newBookingId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'paid' })
    });
    console.log(`Admin confirmed booking #${newBookingId} -> status is now PAID`);

    // 5. Customer fetches their bookings
    const fetchMyBookings = await fetch('http://localhost:5000/api/bookings/my', {
      headers: { Authorization: `Bearer ${custToken}` }
    });
    const myBookingsRes = await fetchMyBookings.json();
    
    // Find the newly created booking
    const myBooking = myBookingsRes.data.find(b => b.id === newBookingId);
    
    console.log('\n--- TEST RESULTS ---');
    console.log(`Booking ID: ${myBooking.id}`);
    console.log(`Status: ${myBooking.status.toUpperCase()}`);
    console.log(`Tickets generated: ${myBooking.Tickets ? myBooking.Tickets.length : 0}`);
    
    if (myBooking.Tickets && myBooking.Tickets.length > 0) {
      myBooking.Tickets.forEach((ticket, idx) => {
        console.log(`[Vé ${idx + 1}] Hành khách: ${ticket.customer_name} | Loại: ${ticket.customer_type} | Tuổi: ${ticket.customer_age}`);
      });
    }

  } catch (err) {
    console.error('Test failed:', err.message);
  }
}

runTest();
