-- 1. Crear la tabla de Perfiles Extendidos (se enlazará con auth.users de Supabase)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'professor')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Crear la tabla de Simulaciones
CREATE TABLE public.simulations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  caso_id TEXT NOT NULL,
  chat_history JSONB NOT NULL,
  juicio_clinico TEXT NOT NULL,
  nota_final NUMERIC,
  feedback TEXT,
  diagnostico_real TEXT,
  es_correcto BOOLEAN,
  puntos_fuertes JSONB,
  puntos_debiles JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar RLS (Row Level Security) para mayor seguridad
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Seguridad (Quién puede ver qué)

-- Los profesores pueden ver todos los perfiles. Los alumnos solo el suyo.
CREATE POLICY "Profiles are viewable by owner and professors" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'professor'
  );

-- Los profesores pueden ver todas las simulaciones. Los alumnos solo las suyas.
CREATE POLICY "Simulations viewable by owner and professors" ON public.simulations
  FOR SELECT USING (
    auth.uid() = student_id OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'professor'
  );

-- Los usuarios autenticados pueden insertar sus propias simulaciones
CREATE POLICY "Users can insert their own simulations" ON public.simulations
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- 5. Trigger automático: Cuando se invita a un usuario, se le crea un perfil vacío
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'student');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
