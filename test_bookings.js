async function check() {
  const res1 = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'customer1@travel.com', password: 'Customer@123' })
  });
  const data1 = await res1.json();
  const token = data1.token;

  const res2 = await fetch('http://localhost:5000/api/bookings/my', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data2 = await res2.json();
  console.log('Bookings:', data2.data);
}
check();
