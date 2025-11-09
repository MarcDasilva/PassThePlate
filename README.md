PassThePlate

The idea was reinvented from a previous endeavour to bring awareness to food insecurity and food waste to my locak community. Previously, I started a local non profit organization to help raise food donations for those in need in the community, and this project is an extension of that endeavour. Pass The Plate aims to reduce food waste and increase access to food for those in need.

What makes us NEEDED: ⬇ Food insecurity affects millions, where malnutrition causes illness to both adults and children. ⬇Billions of dollars are lost in food waste, where 30-40% of the US food supply is wasted. ⬇ Government services are unreliable, where billions of dollars can get with held at any moment. ⬇Food insecurity data is scarce in low income countries ⬇ Food banks are often difficult to reach, and are highly stigmatized. ⬇ Lack of opportunities for people to give back to their community in frictionless manners.

PassThePlate Fixes this by: ⬆ Making food donation simple, allowing for frictionless engagement and rewards. ⬆ Providing people in need with local and easy ways to collect affordable food. Done in a stigmatized free manner similar to Facebook marketplace porch-pickup. ⬆Reduce food waste, allowing better spending opportunities for people in need. ⬆Using custom ML models to predict where donations are needed most in real time. ⬆ Collects data of food insecurity in secluded and tailored areas, providing valuable insights for further studies and research. ⬆Creating a community-driven platform that connects neighbours around the globe

🛠️ How we built it

Built with a modular architecture connecting frontend visualization, ML predictions, AI processing, and payment systems.

🤖 AI & ML ML Backend (FastAPI on AWS EC2): XGBoost / scikit-learn for food necessity prediction pandas / numpy for data processing joblib for model serialization Custom model trained on seasonal patterns, food insecurity data, and historical donations

ML Loss Function: need_score = ( food_insecurity_rate * 0.38 + poverty_rate * 0.33 + donation_factor * 0.21 + population_factor * 0.08 ) * seasonal_multiplier

AI Integration (Google Gemini API): Gemini 2.5 Flash for image analysis and donation descriptions Gemini 1.5 Flash for statistics estimation Gemini Pro Vision for content moderation Natural language processing for coordinate-to-location conversion

The Power of Gemini (How it was used):

Image analysis to describe donations and estimate value
Content moderation for donation descriptions, rejecting malicious content from entering feed
Live statistic predictions from request descriptions in all locations
Coordinate-to-location name conversion
Monetary Donations: Integrated Stripe payments for monetary contributions ($1-$10) with visual connection maps showing donation flows.

💻 Frontend Next.js 16 + React 18 + TypeScript: react-globe.gl for 3D world map visualization react-leaflet / leaflet for 2D interactive maps three.js / @react-three/fiber for 3D graphics Tailwind CSS for styling Server-side rendering for performance 💾 Database & Backend Supabase (PostgreSQL): Row Level Security (RLS) for data protection Real-time subscriptions Authentication system Tables: profiles, donations, requests, monetary_donations, locations, ml_predictions Next.js API Routes: Serverless functions on Vercel Proxy endpoints for ML API (CORS handling) Stripe webhook handlers Gemini API integration endpoints

💳 Payments Stripe Integration: Stripe Checkout for monetary donations Webhook handlers for payment confirmation Secure payment processing with metadata tracking

☁️ Infrastructure Vercel: Frontend deployment (serverless) AWS EC2: ML backend hosting (Amazon Linux) Nginx: Reverse proxy for ML API systemd: Service management

🧩 Challenges we ran into ML Model Deployment: Deploying the ML model on AWS EC2 with proper service management and reverse proxy setup CORS Issues: Handling CORS between Vercel frontend and EC2 ML backend, solved with Next.js API proxy routes Real-time Map Performance: Optimizing 3D globe rendering with many data points, implemented request grouping and location clustering AI Integration: Managing multiple Gemini API endpoints with fallback strategies for reliability Data Collection: Gathering training data for the ML model from multiple sources (USDA, Feeding America, Census Bureau)




